export type Vec3 = { x: number; y: number; z: number };

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export namespace Vec3 {
  export const ZERO = Object.freeze(vec3(0, 0, 0));
  export const ONE = Object.freeze(vec3(1, 1, 1));

  export function asArray(vec: Vec3): [number, number, number] {
    return [vec.x, vec.y, vec.z];
  }

  export function add(...vectors: Vec3[]): Vec3 {
    const result = vec3(0, 0, 0);
    for (const vec of vectors) {
      result.x += vec.x;
      result.y += vec.y;
      result.z += vec.z;
    }
    return result;
  }

  export function subtract(a: Vec3, b: Vec3): Vec3 {
    return vec3(a.x - b.x, a.y - b.y, a.z - b.z);
  }

  export function normalized(vec: Vec3): Vec3 {
    const length = Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
    if (length === 0) return vec3(0, 0, 0);
    return vec3(vec.x / length, vec.y / length, vec.z / length);
  }

  export function scaled(vec: Vec3, scalar: number): Vec3 {
    return vec3(vec.x * scalar, vec.y * scalar, vec.z * scalar);
  }

  export function dot(a: Vec3, b: Vec3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  export function cross(a: Vec3, b: Vec3): Vec3 {
    return vec3(
      a.y * b.z - a.z * b.y,
      a.z * b.x - a.x * b.z,
      a.x * b.y - a.y * b.x
    );
  }

  export function equals(a: Vec3, b: Vec3, epsilon = 1e-10): boolean {
    return Math.abs(a.x - b.x) < epsilon
        && Math.abs(a.y - b.y) < epsilon
        && Math.abs(a.z - b.z) < epsilon;
  }
}
