import React from "react";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
}

export function DragonflyIcon({ size = 24, color = "#000" }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Head */}
      <Circle cx={12} cy={4.2} r={2.2} fill={color} />
      {/* Thorax */}
      <Ellipse cx={12} cy={8} rx={1.6} ry={2} fill={color} />
      {/* Abdomen */}
      <Path
        d="M12 10c-.6 0-1 .3-1 .7l-.15 2-.1 2-.05 1.8v2c0 .8.5 1.2 1.3 1.2s1.3-.4 1.3-1.2v-2l-.05-1.8-.1-2-.15-2c0-.4-.4-.7-1-.7z"
        fill={color}
      />
      {/* Tail tip */}
      <Path d="M11.3 19.5l.7 1.8.7-1.8" fill={color} />
      {/* Upper wings */}
      <Path
        d="M10.4 6.5Q6 4.5 1.8 4.2c-1-.1-1.3.6-.7 1.4Q4.5 9 10.4 8.8z"
        fill={color}
        opacity={0.55}
      />
      <Path
        d="M13.6 6.5Q18 4.5 22.2 4.2c1-.1 1.3.6.7 1.4Q19.5 9 13.6 8.8z"
        fill={color}
        opacity={0.55}
      />
      {/* Lower wings */}
      <Path
        d="M10.4 8.5Q6.5 9.8 3 13.5c-.8.7-.5 1.4.2 1.3Q7 13.5 10.4 10.2z"
        fill={color}
        opacity={0.4}
      />
      <Path
        d="M13.6 8.5Q17.5 9.8 21 13.5c.8.7.5 1.4-.2 1.3Q17 13.5 13.6 10.2z"
        fill={color}
        opacity={0.4}
      />
    </Svg>
  );
}
