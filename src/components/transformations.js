// transformations.js

function roundToPrecision(value, precision = 6) {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

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

  return [roundToPrecision(x), roundToPrecision(y), roundToPrecision(z)];
}

export function scalePoint(point, scaleX, scaleY, scaleZ) {
  const [x, y, z] = point;
  return [
    roundToPrecision(x * scaleX),
    roundToPrecision(y * scaleY),
    roundToPrecision(z * scaleZ),
  ];
}

export function shearPoint(point, shearXY, shearXZ, shearYX, shearYZ, shearZX, shearZY) {
  let [x, y, z] = point;
  x = x + shearXY * y + shearXZ * z;
  y = y + shearYX * x + shearYZ * z;
  z = z + shearZX * x + shearZY * y;
  return [
    roundToPrecision(x),
    roundToPrecision(y),
    roundToPrecision(z),
  ];
}
