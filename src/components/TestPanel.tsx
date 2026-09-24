import React, { useRef, useState, useEffect } from "react";
import { Stage, Layer, Ring, Arc } from "react-konva";

const TestPanel = () => {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 300, height: 150 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      setSize({ width: el.clientWidth, height: el.clientHeight });
    };

    updateSize();

    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => updateSize());
      ro.observe(el);
    } else {
      window.addEventListener("resize", updateSize);
    }

    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", updateSize);
    };
  }, []);

  const cx = size.width / 2;
  const cy = size.height / 2;
  const base = Math.min(size.width, size.height);
  const innerRadius = Math.max(2, Math.round(base * 0.25));
  const outerRadius = Math.max(innerRadius + 2, Math.round(base * 0.30));

  // arc settings
  const arcAngle = 40; // degrees (length of colored arc)
  const arcStartRotation = 0; // start position in degrees (0 is to the right, positive is clockwise)

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        border: "green solid 2px",
      }}
    >
      <Stage width={size.width} height={size.height}>
        <Layer>
          {/* full ring background */}
          <Ring
            x={cx}
            y={cy}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            fill="yellow"
            stroke="black"
            strokeWidth={4}
          />

          {/* colored arc segment with same radii */}
          <Arc
            x={cx}
            y={cy}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            angle={arcAngle}
            rotation={arcStartRotation}
            fill="rgba(0, 122, 255, 0.9)"
            stroke="black"
            strokeWidth={2}
            clockwise={false}
          />
        </Layer>
      </Stage>
    </div>
  );
};

export default TestPanel;