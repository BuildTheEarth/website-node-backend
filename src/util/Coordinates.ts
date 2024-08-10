import * as turf from "@turf/turf";

import { point, polygon } from "@turf/helpers";
import { NextFunction, Request, Response } from "express";
import { Point, Polygon } from "geojson";
import { ERROR_GENERIC, ERROR_VALIDATION } from "./Errors.js";

// lat, lng
export function toPoint(coords: string, splitter?: string): Point {
  return point(coords.split(splitter || ", "));
}

// ["lat, lng","lat, lng","lat, lng","lat, lng"]
export function toPolygon(
  coords: string[],
  splitter?: string,
  reverse?: boolean,
): Polygon {
  return polygon([
    coords.map((c) => {
      const s = c.split(splitter || ", ");
      return [parseFloat(s[reverse ? 1 : 0]), parseFloat(s[reverse ? 0 : 1])];
    }),
  ]);
}

export function toLngLat(
  coords: string,
  latFirst?: boolean,
  splitter?: string,
): { lat: number; lng: number } {
  const s = coords.split(splitter || ", ");
  return {
    lat: parseFloat(s[latFirst ? 0 : 1]),
    lng: parseFloat(s[latFirst ? 1 : 0]),
  };
}

export function toOverpassPolygon(coords: string[]): string {
  return coords.map((c) => `${c.split(", ")[1]} ${c.split(", ")[0]}`).join(" ");
}

// Parses any acceptable coordinate input into an uniform type (["lng, lat","lng, lat"])
export function useCoordinateInput(coordinates: string, required?: boolean) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const coords = req.body[coordinates];
    const coordType =
      (req.query.coordType as string) || CoordinateType.STRING_ARRAY;

    req.body[coordinates + "__old"] = req.body[coordinates];

    if (!coords) {
      if (required) {
        return ERROR_VALIDATION(req, res, [
          { msg: "Invalid Value", param: coordinates, location: "body" },
        ]);
      }
      next();
    } else {
      try {
        const coordsParsed = parseCoordinates(coords, coordType);

        if (coordsParsed.at(0) != coordsParsed.at(-1)) {
          coordsParsed.push(coordsParsed.at(0));
        }

        req.body[coordinates + "__old"] = req.body[coordinates];
        req.body[coordinates] = coordsParsed;
        next();
      } catch (e) {
        return ERROR_GENERIC(
          req,
          res,
          500,
          "Error parsing coordinates. Correct type?",
        );
      }
    }
  };
}

export const CoordinateType = {
  STRING_REVERSE: "stringreverse",
  STRING: "string",
  OBJECT: "object",
  STRING_ARRAY: "stringarray",
  STRING_ARRAY_REVERSE: "stringarrayreverse",
  ARRAY: "array",
  ARRAY_REVERSE: "arrayreverse",
  NUMBER_ARRAY: "numberarray",
  NUMBER_ARRAY_REVERSE: "numberarrayreverse",
};

export function parseCoordinates(coords: any, type: string) {
  switch (type) {
    // "lat, lng; lat, lng; lat, lng"
    case CoordinateType.STRING_REVERSE: {
      return coords
        .split(";")
        .map((c) => `${c.split(",")[1].trim()}, ${c.split(",")[0].trim()}`);
    }
    // "lng, lat; lng, lat; lng, lat"
    case CoordinateType.STRING: {
      return coords.split(";").map((c) => c.trim());
    }
    // [{lat: lat, lng: lng}] or [{lat: lat, lon: lng}]
    case CoordinateType.OBJECT: {
      return coords.map((c) => `${(c.lng || c.lon).trim()}, ${c.lat.trim()}`);
    }
    // ["lng, lat","lng, lat","lng, lat"]
    case CoordinateType.STRING_ARRAY: {
      return coords;
    }
    // ["lat, lng","lat, lng","lat, lng"]
    case CoordinateType.STRING_ARRAY_REVERSE: {
      return coords.map(
        (c) => `${c.split(",")[1].trim()}, ${c.split(",")[0].trim()}`,
      );
    }
    // [["lng","lat"],["lng","lat"],["lng","lat"]]
    case CoordinateType.ARRAY: {
      return coords.map((c) => `${c[0].trim()}, ${c[1].trim()}`);
    }
    // [["lat","lng"],["lat","lng"],["lat","lng"]]
    case CoordinateType.ARRAY_REVERSE: {
      return coords.map((c) => `${c[1].trim()}, ${c[0].trim()}`);
    }
    // [[lng,lat],[lng,lat],[lng,lat]]
    case CoordinateType.NUMBER_ARRAY: {
      return coords.map((c) => `${c[0]}, ${c[1]}`);
    }
    // [[lat,lng],[lat,lng],[lat,lng]]
    case CoordinateType.NUMBER_ARRAY_REVERSE: {
      return coords.map((c) => `${c[1]}, ${c[0]}`);
    }
    default: {
      return [];
    }
  }
}

export default turf;
