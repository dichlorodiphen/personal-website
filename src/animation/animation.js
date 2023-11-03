import { Line } from "./line.js";
import { Vector } from "./vector.js";

export class Animation {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.lines = [];

        // Styling
        this.ctx.lineWidth = 1;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = "#DEB9F6";
        this.ctx.strokeStyle = "#DEB9F6";
        this.ctx.lineCap = "round";
        this.ctx.fillStyle = "#1A171C";
    }

    // Start animation.
    start() {
        if (this.intervalID) {
            clearInterval(this.intervalID);
        }
        this.intervalID = setInterval(() => {
            this.lines.push(this.getInitialLine());
            window.requestAnimationFrame(this.draw.bind(this));
        }, 4000);
    }

    // Stop animation.
    stop() {
        clearInterval(this.intervalID);
    }

    /**
     * A quartic ease-in-out timing function.
     *
     * Taken from https://easings.net/#easeInOutQuart.
     *
     * @param {Number} x value between 0 and 1
     * @returns the result of the easing function
     */
    easingFunction(x) {
        if (x >= 1) {
            return 1;
        }
        if (x <= 0) {
            return 0;
        }

        return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
    }

    /**
     * Performs linear interpolation with given arguments.
     *
     * @param {*} start start value
     * @param {*} end end value
     * @param {*} progress a value between 0 and 1 denoting progress from start to end
     * @returns interpolated value
     */
    lerp(start, end, progress) {
        return (end - start) * progress + start;
    }

    // Draw next frame.
    draw(timestamp) {
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        for (const l of this.lines) {
            if (!l.startTime) {
                l.startTime = timestamp;
            }
            const elapsed = timestamp - l.startTime;

            this.ctx.beginPath();
            this.ctx.moveTo(l.startX, l.startY);
            this.ctx.lineTo(l.x, l.y);
            this.ctx.stroke();

            if (l.erasing) {
                if (l.progress < 0.3 && !l.branched) {
                    this.branch(l);
                } else if (l.progress < 0) {
                    this.remove(l);
                } else {
                    l.progress = 1 - this.easingFunction(l.delta * elapsed);
                    l.x = this.lerp(l.startX, l.endX, l.progress);
                    l.y = this.lerp(l.startY, l.endY, l.progress);
                }
            } else if (l.progress < 1 && l.progress >= 0) {
                l.progress = this.easingFunction(l.delta * elapsed);
                l.x = this.lerp(l.startX, l.endX, l.progress);
                l.y = this.lerp(l.startY, l.endY, l.progress);
            } else if (l.progress >= 1) {
                l.startTime = timestamp;
                l.erase();
            }
        }
        window.requestAnimationFrame(this.draw.bind(this));
    }

    // Remove a line from the animation.
    remove(l) {
        const i = this.lines.indexOf(l);
        if (i < 0) {
            throw new Error("line not found for removal");
        }
        this.lines.splice(i, 1);
    }

    // Divide into branches from the original endpoint of the given line
    // (assuming the line has already been reversed).
    branch(l) {
        // Get original vector and branching point.
        const v = l.getVector();

        let [startX, startY] = [l.endX, l.endY];
        if (l.erasing) {
            [startX, startY] = [l.startX, l.startY];
        }

        // Decide whether or not to branch.
        l.branched = true;
        if (Math.random() > 0.9 / l.decay) {
            return;
        }

        // Create branches.
        // TODO: Pull into config.
        const minBranches = 1;
        const maxBranches = 2;
        const branches = Math.floor(
            Math.random() * (maxBranches - minBranches + 1) + minBranches
        );

        const startAngle = -Math.PI / 2;
        const endAngle = Math.PI / 2;
        const range = (endAngle - startAngle) / branches;
        for (let i = 0; i < branches; i++) {
            v.randomRotate(
                startAngle + range * i,
                startAngle + range * (i + 1)
            );
            v.normalize();
            v.scale(Math.random() * 150 + 50);

            const [endX, endY] = [startX + v.x, startY + v.y];
            if (
                startX >= 0 &&
                startY >= 0 &&
                endX < this.canvas.width &&
                endY < this.canvas.height
            ) {
                this.lines.push(
                    new Line(startX, startY, endX, endY, l.decay + 2)
                );
            }
        }
    }

    // Randomly generate a line directed from the edge of the canvas to the
    // center.
    getInitialLine() {
        const [x, y] = this.getBorderPoint();
        const v = this.getVectorToCenter(x, y);

        v.randomRotate(-Math.PI / 6, Math.PI / 6);
        v.normalize();
        v.scale(Math.random() * 150 + 50);

        const l = new Line(x, y, x + v.x, y + v.y);
        return l;
    }

    // Get a random point on the border of the canvas with uniform distribution.
    getBorderPoint() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const x = Math.floor(Math.random() * (2 * w + 2 * h));

        // Top
        if (x < w) {
            return [0, x];
        }

        // Right
        if (x < w + h) {
            return [w, x - w];
        }

        // Bottom
        if (x < 2 * w + h) {
            return [x - (w + h), h];
        }

        // Left
        return [0, x - (2 * w + h)];
    }

    // Get vector from given point to center of canvas.
    getVectorToCenter(x, y) {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        return new Vector(cx - x, cy - y);
    }
}
