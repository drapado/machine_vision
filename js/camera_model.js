"use strict";

(function () {
    function byId(id) {
        return document.getElementById(id);
    }

    function clamp(x, a, b) {
        return Math.max(a, Math.min(b, x));
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function mapSlider(x, minValue, maxValue) {
        return lerp(minValue, maxValue, clamp(x, 0, 1));
    }

    function rotY(p, angle) {
        let c = Math.cos(angle);
        let s = Math.sin(angle);
        return [c * p[0] + s * p[2], p[1], -s * p[0] + c * p[2]];
    }

    function rotX(p, angle) {
        let c = Math.cos(angle);
        let s = Math.sin(angle);
        return [p[0], c * p[1] - s * p[2], s * p[1] + c * p[2]];
    }

    function rotZ(p, angle) {
        let c = Math.cos(angle);
        let s = Math.sin(angle);
        return [c * p[0] - s * p[1], s * p[0] + c * p[1], p[2]];
    }

    function rotateWorldToView(p, yaw, pitch) {
        return rotX(rotY(p, yaw), pitch);
    }

    function rotateEuler(p, yaw, pitch, roll) {
        return rotZ(rotX(rotY(p, yaw), pitch), roll);
    }

    function worldToScreen(point, width, height, yaw, pitch, zoom) {
        let p = rotateWorldToView(point, yaw, pitch);
        let depth = p[2] + 7.0;
        let zoomFactor = zoom === undefined ? 1.0 : zoom;
        let scale = Math.min(width, height) * 0.65 * zoomFactor / depth;
        return [width * 0.5 + p[0] * scale, height * 0.56 - p[1] * scale, depth];
    }

    function drawLine2D(ctx, a, b, color, lineWidth) {
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth || 1.6;
        ctx.stroke();
    }

    function drawPoint2D(ctx, p, color, r) {
        ctx.beginPath();
        ctx.arc(p[0], p[1], r || 4.0, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    }

    function drawPolygon(ctx, points, stroke, fill) {
        if (!points.length) {
            return;
        }
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i][0], points[i][1]);
        }
        ctx.closePath();
        if (fill) {
            ctx.fillStyle = fill;
            ctx.fill();
        }
        if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }

    function drawLabel(ctx, text, x, y, color) {
        ctx.fillStyle = color || "#333";
        ctx.font = "13px IBM Plex Sans";
        ctx.fillText(text, x, y);
    }

    function add3(a, b) {
        return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    }

    function scale3(v, s) {
        return [v[0] * s, v[1] * s, v[2] * s];
    }

    function getPlaneViewAngles(mode, yaw, pitch) {
        if (mode === 1) {
            return [0, 0];
        }
        if (mode === 2) {
            return [-Math.PI * 0.5, 0];
        }
        if (mode === 3) {
            return [0, -Math.PI * 0.5];
        }
        return [yaw, pitch];
    }

    function makeViewProjector(width, height, mode, yaw, pitch, fitPoints, zoom) {
        let va = getPlaneViewAngles(mode, yaw, pitch);

        if (mode === 0) {
            return function (p) {
                return worldToScreen(p, width, height, va[0], va[1], zoom);
            };
        }

        let rotated = (fitPoints || []).map(function (p) {
            return rotateWorldToView(p, va[0], va[1]);
        });

        if (!rotated.length) {
            rotated = [[0, 0, 0], [1, 1, 0], [-1, -1, 0]];
        }

        let minX = rotated[0][0];
        let maxX = rotated[0][0];
        let minY = rotated[0][1];
        let maxY = rotated[0][1];

        for (let i = 1; i < rotated.length; i++) {
            minX = Math.min(minX, rotated[i][0]);
            maxX = Math.max(maxX, rotated[i][0]);
            minY = Math.min(minY, rotated[i][1]);
            maxY = Math.max(maxY, rotated[i][1]);
        }

        let spanX = Math.max(0.9, maxX - minX);
        let spanY = Math.max(0.9, maxY - minY);
        let centerX = (minX + maxX) * 0.5;
        let centerY = (minY + maxY) * 0.5;

        let availW = width * 0.82;
        let availH = height * 0.74;
        let scale = Math.min(availW / spanX, availH / spanY);

        return function (p) {
            let r = rotateWorldToView(p, va[0], va[1]);
            return [
                width * 0.5 + (r[0] - centerX) * scale,
                height * 0.56 - (r[1] - centerY) * scale,
                r[2]
            ];
        };
    }

    function makeCanvasDemo(containerId, drawCallback, dragCallback, wheelCallback) {
        let container = byId(containerId);
        if (!container) {
            return null;
        }

        let wrapper = document.createElement("div");
        wrapper.classList.add("canvas_container");
        wrapper.classList.add("non_selectable");

        let canvas = document.createElement("canvas");
        canvas.classList.add("non_selectable");
        wrapper.appendChild(canvas);
        container.appendChild(wrapper);

        let ctx = canvas.getContext("2d");
        let pixelRatio = Math.min(2, Math.max(1, Math.floor(window.devicePixelRatio || 1)));

        function repaint() {
            let bounds = wrapper.getBoundingClientRect();
            let width = Math.max(2, Math.floor(bounds.width));
            let height = Math.max(2, Math.floor(bounds.height));

            canvas.width = width * pixelRatio;
            canvas.height = height * pixelRatio;
            canvas.style.width = width + "px";
            canvas.style.height = height + "px";

            ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
            ctx.clearRect(0, 0, width, height);
            drawCallback(ctx, width, height);
        }

        if (dragCallback) {
            new Dragger(wrapper, function (dx, dy) {
                dragCallback(dx, dy);
                repaint();
            });
        }

        if (wheelCallback) {
            wrapper.addEventListener("wheel", function (e) {
                let handled = wheelCallback(e.deltaY);
                if (handled) {
                    e.preventDefault();
                    repaint();
                }
            }, { passive: false });
        }

        window.addEventListener("resize", repaint, true);
        window.addEventListener("load", repaint, true);

        repaint();

        return {
            repaint: repaint
        };
    }

    function drawStep2_3D(ctx, width, height, state) {
        let f = state.f;
        let point = [state.pointX, state.pointY, state.pointZ];
        let proj = [f * point[0] / point[2], f * point[1] / point[2], f];

        let cam = [0, 0, 0];
        let planeHalfW = 1.3;
        let planeHalfH = 0.9;
        let planeCorners = [
            [-planeHalfW, -planeHalfH, f],
            [planeHalfW, -planeHalfH, f],
            [planeHalfW, planeHalfH, f],
            [-planeHalfW, planeHalfH, f]
        ];

        let fitPoints = [cam, point, proj].concat(planeCorners, [
            [1.4, 0, 0],
            [0, 1.4, 0],
            [0, 0, 1.4]
        ]);
        let view = makeViewProjector(width, height, state.planeMode, state.yaw, state.pitch, fitPoints, state.viewZoom);

        function drawSelectedPlane(center, size) {
            if (state.planeMode === 0) {
                return;
            }

            if (state.planeMode === 1) {
                let planeXY = [
                    [center[0] - size, center[1] - size, center[2]],
                    [center[0] + size, center[1] - size, center[2]],
                    [center[0] + size, center[1] + size, center[2]],
                    [center[0] - size, center[1] + size, center[2]]
                ].map(view);
                drawPolygon(ctx, planeXY, "rgba(236,81,81,0.45)", "rgba(236,81,81,0.10)");
                return;
            }

            if (state.planeMode === 2) {
                let planeYZ = [
                    [center[0], center[1] - size, center[2] - size],
                    [center[0], center[1] - size, center[2] + size],
                    [center[0], center[1] + size, center[2] + size],
                    [center[0], center[1] + size, center[2] - size]
                ].map(view);
                drawPolygon(ctx, planeYZ, "rgba(85,196,50,0.45)", "rgba(85,196,50,0.10)");
                return;
            }

            let planeXZ = [
                [center[0] - size, center[1], center[2] - size],
                [center[0] + size, center[1], center[2] - size],
                [center[0] + size, center[1], center[2] + size],
                [center[0] - size, center[1], center[2] + size]
            ].map(view);
            drawPolygon(ctx, planeXZ, "rgba(245,166,35,0.55)", "rgba(245,166,35,0.14)");
        }

        drawSelectedPlane([0, 0, 0], 1.3);

        let screenCorners = planeCorners.map(view);
        let cam2 = view(cam);
        let p2 = view(point);
        let proj2 = view(proj);

        drawPolygon(ctx, screenCorners, "rgba(33,130,199,0.7)", "rgba(33,130,199,0.10)");

        let axisLen = 1.4;
        let xAxis = view([axisLen, 0, 0]);
        let yAxis = view([0, axisLen, 0]);
        let zAxis = view([0, 0, axisLen]);
        drawLine2D(ctx, cam2, xAxis, "#EC5151", 1.8);
        drawLine2D(ctx, cam2, yAxis, "#55C432", 1.8);
        drawLine2D(ctx, cam2, zAxis, "#418DE2", 1.8);

        drawLine2D(ctx, cam2, p2, "rgba(255,89,63,0.85)", 2.0);
        drawLine2D(ctx, cam2, proj2, "rgba(33,130,199,0.65)", 1.6);
        drawLine2D(ctx, p2, proj2, "rgba(0,0,0,0.25)", 1.2);

        drawPoint2D(ctx, cam2, "#333", 4.2);
        drawPoint2D(ctx, p2, "#FF593F", 5.0);
        drawPoint2D(ctx, proj2, "#2182C7", 4.4);

        drawLabel(ctx, "Camera center O", cam2[0] + 8, cam2[1] - 8);
        drawLabel(ctx, "3D point X", p2[0] + 8, p2[1] - 8, "#C44732");
        drawLabel(ctx, "Projected point x", proj2[0] + 8, proj2[1] - 8, "#1E6FA8");
        drawLabel(ctx, "Image plane Z = f", screenCorners[0][0] + 8, screenCorners[0][1] - 10, "#1E6FA8");

        if (state.planeMode === 1) {
            drawLabel(ctx, "XY plane view", 16, 24, "#333");
        } else if (state.planeMode === 2) {
            drawLabel(ctx, "YZ plane view", 16, 24, "#333");
        } else if (state.planeMode === 3) {
            drawLabel(ctx, "XZ plane view", 16, 24, "#333");
        } else {
            drawLabel(ctx, "3D view (mouse wheel to zoom)", 16, 24, "#333");
        }
    }

    function makeStep2Demo() {
        let state = {
            f: 1.2,
            pointX: 0.8,
            pointY: 0.5,
            pointZ: 2.6,
            yaw: -0.6,
            pitch: 0.45,
            planeMode: 0,
            viewZoom: 1.0
        };

        let demo = makeCanvasDemo("cam_model_step2", function (ctx, width, height) {
            drawStep2_3D(ctx, width, height, state);
        }, function (dx, dy) {
            if (state.planeMode !== 0) {
                return;
            }
            state.yaw += dx * 0.006;
            state.pitch = clamp(state.pitch + dy * 0.006, -1.2, 1.2);
        }, function (deltaY) {
            if (state.planeMode !== 0) {
                return false;
            }
            let factor = deltaY < 0 ? 1.08 : 0.92;
            state.viewZoom = clamp(state.viewZoom * factor, 0.55, 2.8);
            return true;
        });

        let slF = byId("cam_model_step2_sl0");
        let slX = byId("cam_model_step2_sl1");
        let slY = byId("cam_model_step2_sl2");
        let slZ = byId("cam_model_step2_sl3");
        let planeSeg = byId("cam_model_step2_planes");

        if (slF) {
            new Slider(slF, function (v) {
                state.f = mapSlider(v, 0.5, 2.0);
                if (demo) demo.repaint();
            }, undefined, 0.47);
        }
        if (slX) {
            new Slider(slX, function (v) {
                state.pointX = mapSlider(v, -1.2, 1.2);
                if (demo) demo.repaint();
            }, undefined, 0.83);
        }
        if (slY) {
            new Slider(slY, function (v) {
                state.pointY = mapSlider(v, -1.0, 1.0);
                if (demo) demo.repaint();
            }, undefined, 0.75);
        }
        if (slZ) {
            new Slider(slZ, function (v) {
                state.pointZ = mapSlider(v, 1.2, 4.0);
                if (demo) demo.repaint();
            }, undefined, 0.5);
        }
        if (planeSeg) {
            new SegmentedControl(planeSeg, function (o) {
                state.planeMode = o;
                if (demo) demo.repaint();
            }, ["Image", "XY", "YZ", "XZ"]);
        }
    }

    function drawStep1_3D(ctx, width, height, state) {
        let Xw = [1.2, 0.8, 2.8];
        let f = 1.0;

        let C = [state.cx, state.cy, state.cz];
        let yaw = state.camYaw;
        let pitch = state.camPitch;
        let roll = state.camRoll;

        function Rwc(v) {
            return rotateEuler(v, yaw, pitch, roll);
        }

        function RTwc(v) {
            return rotateEuler(v, -yaw, -pitch, -roll);
        }

        let Xcam = RTwc([Xw[0] - C[0], Xw[1] - C[1], Xw[2] - C[2]]);
        let zCam = Math.max(0.35, Xcam[2]);
        let qCam = [f * Xcam[0] / zCam, f * Xcam[1] / zCam, f];
        let qWorldLocal = Rwc(qCam);
        let qWorld = [C[0] + qWorldLocal[0], C[1] + qWorldLocal[1], C[2] + qWorldLocal[2]];

        let forward = Rwc([0, 0, 1]);
        let right = Rwc([1, 0, 0]);
        let up = Rwc([0, 1, 0]);

        let planeCenter = [C[0] + forward[0] * f, C[1] + forward[1] * f, C[2] + forward[2] * f];
        let hw = 1.1;
        let hh = 0.75;

        let corners = [
            add3(add3(planeCenter, scale3(right, -hw)), scale3(up, -hh)),
            add3(add3(planeCenter, scale3(right, hw)), scale3(up, -hh)),
            add3(add3(planeCenter, scale3(right, hw)), scale3(up, hh)),
            add3(add3(planeCenter, scale3(right, -hw)), scale3(up, hh))
        ];

        let axisScale = 0.75;
        let worldAxisScale = 1.05;
        let fitPoints = [C, Xw, qWorld, planeCenter].concat(corners, [
            [0, 0, 0],
            [worldAxisScale, 0, 0],
            [0, worldAxisScale, 0],
            [0, 0, worldAxisScale],
            add3(C, scale3(right, axisScale)),
            add3(C, scale3(up, axisScale)),
            add3(C, scale3(forward, axisScale))
        ]);
        let view = makeViewProjector(width, height, state.planeMode, state.sceneYaw, state.scenePitch, fitPoints, state.viewZoom);

        let c2 = view(C);
        let x2 = view(Xw);
        let q2 = view(qWorld);
        let center2 = view(planeCenter);
        let corner2 = corners.map(view);

        function drawSelectedLocalPlane(center, axisRight, axisUp, axisForward, size) {
            if (state.planeMode === 0) {
                return;
            }

            if (state.planeMode === 1) {
                let xy = [
                    add3(add3(center, scale3(axisRight, -size)), scale3(axisUp, -size)),
                    add3(add3(center, scale3(axisRight, size)), scale3(axisUp, -size)),
                    add3(add3(center, scale3(axisRight, size)), scale3(axisUp, size)),
                    add3(add3(center, scale3(axisRight, -size)), scale3(axisUp, size))
                ].map(view);
                drawPolygon(ctx, xy, "rgba(236,81,81,0.45)", "rgba(236,81,81,0.10)");
                return;
            }

            if (state.planeMode === 2) {
                let yz = [
                    add3(add3(center, scale3(axisUp, -size)), scale3(axisForward, -size)),
                    add3(add3(center, scale3(axisUp, -size)), scale3(axisForward, size)),
                    add3(add3(center, scale3(axisUp, size)), scale3(axisForward, size)),
                    add3(add3(center, scale3(axisUp, size)), scale3(axisForward, -size))
                ].map(view);
                drawPolygon(ctx, yz, "rgba(85,196,50,0.45)", "rgba(85,196,50,0.10)");
                return;
            }

            let xz = [
                add3(add3(center, scale3(axisRight, -size)), scale3(axisForward, -size)),
                add3(add3(center, scale3(axisRight, size)), scale3(axisForward, -size)),
                add3(add3(center, scale3(axisRight, size)), scale3(axisForward, size)),
                add3(add3(center, scale3(axisRight, -size)), scale3(axisForward, size))
            ].map(view);
            drawPolygon(ctx, xz, "rgba(245,166,35,0.55)", "rgba(245,166,35,0.14)");
        }

        drawSelectedLocalPlane(C, right, up, forward, 0.9);

        drawPolygon(ctx, corner2, "rgba(33,130,199,0.7)", "rgba(33,130,199,0.10)");

        drawLine2D(ctx, c2, x2, "rgba(255,89,63,0.85)", 2.0);
        drawLine2D(ctx, c2, q2, "rgba(33,130,199,0.85)", 1.8);

        drawPoint2D(ctx, c2, "#333", 4.5);
        drawPoint2D(ctx, x2, "#FF593F", 5.0);
        drawPoint2D(ctx, q2, "#2182C7", 4.4);

        drawLine2D(ctx, c2, center2, "rgba(0,0,0,0.3)", 1.2);

        let rx = view(add3(C, scale3(right, axisScale)));
        let ry = view(add3(C, scale3(up, axisScale)));
        let rz = view(add3(C, scale3(forward, axisScale)));

        let worldOrigin = [0, 0, 0];
        let worldOrigin2 = view(worldOrigin);
        let worldX2 = view([worldAxisScale, 0, 0]);
        let worldY2 = view([0, worldAxisScale, 0]);
        let worldZ2 = view([0, 0, worldAxisScale]);

        drawLine2D(ctx, worldOrigin2, worldX2, "rgba(236,81,81,0.55)", 1.4);
        drawLine2D(ctx, worldOrigin2, worldY2, "rgba(85,196,50,0.55)", 1.4);
        drawLine2D(ctx, worldOrigin2, worldZ2, "rgba(65,141,226,0.55)", 1.4);
        drawPoint2D(ctx, worldOrigin2, "#666", 3.6);

        drawLine2D(ctx, c2, rx, "#EC5151", 1.7);
        drawLine2D(ctx, c2, ry, "#55C432", 1.7);
        drawLine2D(ctx, c2, rz, "#418DE2", 1.7);

        drawLabel(ctx, "Camera C", c2[0] + 8, c2[1] - 8);
        drawLabel(ctx, "World point X", x2[0] + 8, x2[1] - 8, "#C44732");
        drawLabel(ctx, "Projected x", q2[0] + 8, q2[1] - 8, "#1E6FA8");
        drawLabel(ctx, "Image plane", corner2[0][0] + 8, corner2[0][1] - 10, "#1E6FA8");
        drawLabel(ctx, "World origin O_w", worldOrigin2[0] + 8, worldOrigin2[1] + 14, "#555");

        if (state.planeMode === 1) {
            drawLabel(ctx, "Camera XY plane view", 16, 24, "#333");
        } else if (state.planeMode === 2) {
            drawLabel(ctx, "Camera YZ plane view", 16, 24, "#333");
        } else if (state.planeMode === 3) {
            drawLabel(ctx, "Camera XZ plane view", 16, 24, "#333");
        } else {
            drawLabel(ctx, "3D view (mouse wheel to zoom)", 16, 24, "#333");
        }
    }

    function makeStep1Demo() {
        let state = {
            cx: -0.4,
            cy: -0.2,
            cz: 0.1,
            camYaw: 0.35,
            camPitch: 0.1,
            camRoll: -0.05,
            sceneYaw: -0.55,
            scenePitch: 0.35,
            planeMode: 0,
            viewZoom: 1.0
        };

        let demo = makeCanvasDemo("cam_model_step1", function (ctx, width, height) {
            drawStep1_3D(ctx, width, height, state);
        }, function (dx, dy) {
            if (state.planeMode !== 0) {
                return;
            }
            state.sceneYaw += dx * 0.006;
            state.scenePitch = clamp(state.scenePitch + dy * 0.006, -1.2, 1.2);
        }, function (deltaY) {
            if (state.planeMode !== 0) {
                return false;
            }
            let factor = deltaY < 0 ? 1.08 : 0.92;
            state.viewZoom = clamp(state.viewZoom * factor, 0.55, 2.8);
            return true;
        });

        let sl0 = byId("cam_model_step1_sl0");
        let sl1 = byId("cam_model_step1_sl1");
        let sl2 = byId("cam_model_step1_sl2");
        let sl3 = byId("cam_model_step1_sl3");
        let sl4 = byId("cam_model_step1_sl4");
        let sl5 = byId("cam_model_step1_sl5");
        let planes = byId("cam_model_step1_planes");

        if (sl0) {
            new Slider(sl0, function (v) {
                state.cx = mapSlider(v, -1.5, 1.5);
                if (demo) demo.repaint();
            }, undefined, 0.37);
        }
        if (sl1) {
            new Slider(sl1, function (v) {
                state.cy = mapSlider(v, -1.0, 1.0);
                if (demo) demo.repaint();
            }, undefined, 0.40);
        }
        if (sl2) {
            new Slider(sl2, function (v) {
                state.cz = mapSlider(v, -1.0, 1.0);
                if (demo) demo.repaint();
            }, undefined, 0.55);
        }
        if (sl3) {
            new Slider(sl3, function (v) {
                state.camYaw = mapSlider(v, -1.2, 1.2);
                if (demo) demo.repaint();
            }, undefined, 0.65);
        }
        if (sl4) {
            new Slider(sl4, function (v) {
                state.camPitch = mapSlider(v, -1.0, 1.0);
                if (demo) demo.repaint();
            }, undefined, 0.55);
        }
        if (sl5) {
            new Slider(sl5, function (v) {
                state.camRoll = mapSlider(v, -1.0, 1.0);
                if (demo) demo.repaint();
            }, undefined, 0.47);
        }
        if (planes) {
            new SegmentedControl(planes, function (o) {
                state.planeMode = o;
                if (demo) demo.repaint();
            }, ["Image", "XY", "YZ", "XZ"]);
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        makeStep2Demo();
        makeStep1Demo();
    });
})();
