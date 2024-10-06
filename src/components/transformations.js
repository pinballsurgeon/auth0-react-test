// transformations.js

// Essential 3D transformations for early end-to-end demonstration

export function rotatePoint(point, rotateX, rotateY, rotateZ) {
  let [x, y, z] = point;

  // Rotation around X-axis
  const cosX = Math.cos((rotateX * Math.PI) / 180);
  const sinX = Math.sin((rotateX * Math.PI) / 180);
  [y, z] = [y * cosX - z * sinX, y * sinX + z * cosX];

  // Rotation around Y-axis
  const cosY = Math.cos((rotateY * Math.PI) / 180);
  const sinY = Math.sin((rotateY * Math.PI) / 180);
  [x, z] = [x * cosY + z * sinY, -x * sinY + z * cosY];

  // Rotation around Z-axis
  const cosZ = Math.cos((rotateZ * Math.PI) / 180);
  const sinZ = Math.sin((rotateZ * Math.PI) / 180);
  [x, y] = [x * cosZ - y * sinZ, x * sinZ + y * cosZ];

  return [x, y, z];
}

export function scalePoint(point, scaleX, scaleY, scaleZ) {
  const [x, y, z] = point;
  return [x * scaleX, y * scaleY, z * scaleZ];
}

export function shearPoint(point, shearXY, shearXZ, shearYX, shearYZ, shearZX, shearZY) {
  let [x, y, z] = point;
  x = x + shearXY * y + shearXZ * z;
  y = y + shearYX * x + shearYZ * z;
  z = z + shearZX * x + shearZY * y;
  return [x, y, z];
}

// Future iterations will add more transformations and improve modularity