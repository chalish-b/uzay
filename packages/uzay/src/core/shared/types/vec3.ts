// 3D vectors as immutable class instances, the Vec2 design with a z component:
// readonly fields, chainable methods that always return a new vector, born
// through vec3(). Adopt plain { x, y, z } objects with Vec3.from(p).
export class Vec3 {
  constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly z: number,
  ) {}

  add(v: Vec3): Vec3 {
    return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  sub(v: Vec3): Vec3 {
    return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  scale(s: number): Vec3 {
    return new Vec3(this.x * s, this.y * s, this.z * s);
  }

  neg(): Vec3 {
    return new Vec3(-this.x, -this.y, -this.z);
  }

  // The unit vector pointing the same way. The zero vector stays zero.
  unit(): Vec3 {
    const l = this.len();
    return l === 0 ? Vec3.ZERO : new Vec3(this.x / l, this.y / l, this.z / l);
  }

  len(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  lenSq(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  dot(v: Vec3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  cross(v: Vec3): Vec3 {
    return new Vec3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x,
    );
  }

  distTo(v: Vec3): number {
    return this.sub(v).len();
  }

  mid(v: Vec3): Vec3 {
    return new Vec3((this.x + v.x) / 2, (this.y + v.y) / 2, (this.z + v.z) / 2);
  }

  // Linear interpolation from this vector (t = 0) toward v (t = 1); values
  // outside [0, 1] extrapolate along the same line.
  lerp(v: Vec3, t: number): Vec3 {
    return new Vec3(
      this.x + (v.x - this.x) * t,
      this.y + (v.y - this.y) * t,
      this.z + (v.z - this.z) * t,
    );
  }

  equals(v: Vec3, epsilon = 1e-10): boolean {
    return (
      Math.abs(this.x - v.x) < epsilon &&
      Math.abs(this.y - v.y) < epsilon &&
      Math.abs(this.z - v.z) < epsilon
    );
  }

  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  static readonly ZERO = Object.freeze(new Vec3(0, 0, 0));
  static readonly ONE = Object.freeze(new Vec3(1, 1, 1));

  // Adopt a plain { x, y, z } object from outside the library.
  static from(p: { x: number; y: number; z: number }): Vec3 {
    return new Vec3(p.x, p.y, p.z);
  }
}

// The everyday constructor, no `new` needed: vec3(1, 2, 3).
export function vec3(x: number, y: number, z: number): Vec3 {
  return new Vec3(x, y, z);
}
