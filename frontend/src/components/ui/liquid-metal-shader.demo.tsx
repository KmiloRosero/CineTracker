import LiquidMetalShader from "@/components/ui/liquid-metal-shader";

/** Stand-alone demo; the app uses the shader through AppBackground and Intro. */
export default function LiquidMetalShaderDemo() {
  return (
    <div className="relative h-screen w-full">
      <LiquidMetalShader className="absolute inset-0" />
    </div>
  );
}
