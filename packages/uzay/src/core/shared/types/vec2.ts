// 2D vectors as immutable class instances: two readonly fields plus chainable
// methods that always return a new vector. Immutability keeps them safe to
// share between items and atoms (Jotai updates need a fresh object anyway),
// and chaining reads left to right: p.sub(from).unit().scale(dist).add(p).
//
// Vectors are born through vec2() (or a method, or a static). A plain { x, y }
// object from outside the library is not a Vec2; adopt it with Vec2.from(p).
export class Vec2 {
  constructor(
    public readonly x: number,
    public readonly y: number,
  ) {}

  add(v: Vec2): Vec2 {
    return new Vec2(this.x + v.x, this.y + v.y);
  }

  sub(v: Vec2): Vec2 {
    return new Vec2(this.x - v.x, this.y - v.y);
  }

  scale(s: number): Vec2 {
    return new Vec2(this.x * s, this.y * s);
  }

  neg(): Vec2 {
    return new Vec2(-this.x, -this.y);
  }

  // The unit vector pointing the same way. The zero vector stays zero.
  unit(): Vec2 {
    const l = this.len();
    return l === 0 ? Vec2.ZERO : new Vec2(this.x / l, this.y / l);
  }

  // The perpendicular direction: this vector rotated 90° counterclockwise.
  perp(): Vec2 {
    return new Vec2(-this.y, this.x);
  }

  rotate(theta: number): Vec2 {
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    return new Vec2(this.x * c - this.y * s, this.x * s + this.y * c);
  }

  len(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  lenSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  dot(v: Vec2): number {
    return this.x * v.x + this.y * v.y;
  }

  // The scalar 2D cross product (the z-component of the 3D one). Useful for
  // winding order and signed area.
  cross(v: Vec2): number {
    return this.x * v.y - this.y * v.x;
  }

  distTo(v: Vec2): number {
    return this.sub(v).len();
  }

  mid(v: Vec2): Vec2 {
    return new Vec2((this.x + v.x) / 2, (this.y + v.y) / 2);
  }

  // Linear interpolation from this vector (t = 0) toward v (t = 1); values
  // outside [0, 1] extrapolate along the same line.
  lerp(v: Vec2, t: number): Vec2 {
    return new Vec2(this.x + (v.x - this.x) * t, this.y + (v.y - this.y) * t);
  }

  equals(v: Vec2, epsilon = 1e-10): boolean {
    return Math.abs(this.x - v.x) < epsilon && Math.abs(this.y - v.y) < epsilon;
  }

  toArray(): [number, number] {
    return [this.x, this.y];
  }

  static readonly ZERO = Object.freeze(new Vec2(0, 0));
  static readonly ONE = Object.freeze(new Vec2(1, 1));

  // Adopt a plain { x, y } object from outside the library.
  static from(p: { x: number; y: number }): Vec2 {
    return new Vec2(p.x, p.y);
  }

  // The unit vector at an angle from the positive x-axis.
  static fromAngle(theta: number): Vec2 {
    return new Vec2(Math.cos(theta), Math.sin(theta));
  }
}

// The everyday constructor, no `new` needed: vec2(1, 2).
export function vec2(x: number, y: number): Vec2 {
  return new Vec2(x, y);
}
