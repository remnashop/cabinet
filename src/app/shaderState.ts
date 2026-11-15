// uTime at wall-clock speed reads as jittery; slows the motion without touching the noise math
export const DEFAULT_TIME_SCALE = 0.2;

export type ShaderUniforms = {
  uTime: { value: number };
  uTimeSin: { value: number };
  uScrollProgress: { value: number };
  // flat rgb triplets, the layout gl.uniform3fv expects for a vec3[4]
  uStops: { value: Float32Array };
  uUvScale: { value: number };
  uUvDistortionIterations: { value: number };
  uUvDistortionIntensity: { value: number };
};
