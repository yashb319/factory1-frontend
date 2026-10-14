import { z } from "zod";

export const attendanceGeofenceSchema = z.object({
  latitude: z
    .number({ error: "Latitude is required" })
    .min(-90, "Latitude must be at least -90")
    .max(90, "Latitude must be at most 90"),
  longitude: z
    .number({ error: "Longitude is required" })
    .min(-180, "Longitude must be at least -180")
    .max(180, "Longitude must be at most 180"),
  radiusMeters: z
    .number({ error: "Radius is required" })
    .int("Radius must be a whole number")
    .min(10, "Radius must be at least 10 metres")
    .max(5000, "Radius must be at most 5,000 metres"),
});
