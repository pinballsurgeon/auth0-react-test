// src/models/Point.js

export class Point {
    constructor(x, y, z, radius, color) {
      this.baseX = x;
      this.baseY = y;
      this.baseZ = z;
      this.x = x;
      this.y = y;
      this.z = z;
      this.radius = radius;
      this.color = color;
      this.history = [];
    }
  
    updatePosition(scaleX, scaleY, scaleZ) {
      this.x = this.baseX * scaleX;
      this.y = this.baseY * scaleY;
      this.z = this.baseZ * scaleZ;
      
      this.updateHistory();
    }
  
    updateHistory() {
      this.history.unshift({ x: this.x, y: this.y, z: this.z });
      if (this.history.length > 100) {
        this.history.pop();
      }
    }
  
    reset() {
      this.x = this.baseX;
      this.y = this.baseY;
      this.z = this.baseZ;
      this.history = [];
    }
  
    clone() {
      const point = new Point(
        this.baseX,
        this.baseY,
        this.baseZ,
        this.radius,
        this.color
      );
      point.history = [...this.history];
      return point;
    }
  }