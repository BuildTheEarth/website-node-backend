import * as turf from "@turf/turf";

import { Point, Polygon } from "geojson";
import { point, polygon } from "@turf/helpers";

// lat, lng
export function toPoint(coords: string, splitter?: string): Point {
  return point(coords.split(splitter || ", "));
}

// ["lat, lng","lat, lng","lat, lng","lat, lng"]
export function toPolygon(coords: string[], splitter?: string): Polygon {
  return polygon([
    coords.map((c) => {
      const s = c.split(splitter || ", ");
      return [parseFloat(s[0]), parseFloat(s[1])];
    }),
  ]);
}

export default turf;
