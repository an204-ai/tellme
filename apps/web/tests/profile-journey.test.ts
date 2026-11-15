import assert from "node:assert/strict";
import { monthRoute } from "../src/lib/profile-journey.ts";

for (const [width, height] of [[264, 424], [334, 444], [722, 450]]) {
  for (const [month, count] of [["2026-02", 28], ["2028-02", 29], ["2026-11", 30], ["2026-12", 31]] as const) {
    const route = monthRoute(month, width!, height!);
    assert.equal(route.points.length, count, `Every day appears in ${month}`);
    assert.ok(route.size >= 32, "Photos stay readable on a 320px screen");
    for (const point of route.points) {
      const half = Math.max(route.size / 2 + 4, 20);
      assert.ok(point.x - half >= 0 && point.x + half <= width!, "Photo and date stay inside both edges");
      assert.ok(point.y - route.size / 2 >= 0 && point.y + route.size / 2 + 14 <= height!, "Date stays above the bottom edge");
    }
    for (let i = 0; i < route.points.length; i++) for (let j = i + 1; j < route.points.length; j++) {
      const a = route.points[i]!, b = route.points[j]!;
      assert.ok(Math.abs(a.x - b.x) >= route.size + 8 || Math.abs(a.y - b.y) >= route.size + 16, "Photo/date pairs never overlap");
    }
  }
}
console.log("Profile journey: 28–31 days fit mobile and desktop without clipping or overlap.");
