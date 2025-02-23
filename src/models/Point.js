// src/models/Point.js

/**
 * The Point class represents a 3D point used in our visualization.
 *
 * In addition to standard 3D coordinates and appearance (radius, color),
 * this class now also holds an imageUrl, which will be used as the texture for a cube.
 *
 * The class also maintains a history of positions (for potential animation trails or debugging).
 */
export class Point {
  /**
   * Constructs a new Point.
   *
   * @param {number} x - The initial x coordinate.
   * @param {number} y - The initial y coordinate.
   * @param {number} z - The initial z coordinate.
   * @param {number} radius - The radius (size) of the point.
   * @param {string} color - The color of the point.
   * @param {string|null} imageUrl - (Optional) URL for the cube texture. Defaults to null.
   */
  constructor(x, y, z, radius, color, imageUrl = null) {
    this.baseX = x;
    this.baseY = y;
    this.baseZ = z;
    this.x = x;
    this.y = y;
    this.z = z;
    this.radius = radius;
    this.color = color;
    this.imageUrl = imageUrl; // New property for texture mapping.
    this.history = [];
  }

  /**
   * Updates the current position based on scaling factors.
   *
   * @param {number} scaleX - Scale factor for the x coordinate.
   * @param {number} scaleY - Scale factor for the y coordinate.
   * @param {number} scaleZ - Scale factor for the z coordinate.
   */
  updatePosition(scaleX, scaleY, scaleZ) {
    this.x = this.baseX * scaleX;
    this.y = this.baseY * scaleY;
    this.z = this.baseZ * scaleZ;
    this.updateHistory();
  }

  /**
   * Records the current position in the history array.
   * Maintains a maximum of 100 history entries.
   */
  updateHistory() {
    this.history.unshift({ x: this.x, y: this.y, z: this.z });
    if (this.history.length > 100) {
      this.history.pop();
    }
  }

  /**
   * Resets the point's current position to its base coordinates and clears its history.
   */
  reset() {
    this.x = this.baseX;
    this.y = this.baseY;
    this.z = this.baseZ;
    this.history = [];
  }

  /**
   * Creates a clone of this point, including its history and texture (imageUrl).
   *
   * @returns {Point} A new Point instance with the same properties.
   */
  clone() {
    const point = new Point(
      this.baseX,
      this.baseY,
      this.baseZ,
      this.radius,
      this.color,
      this.imageUrl // Ensure the texture URL is copied.
    );
    point.history = [...this.history];
    return point;
  }
}
