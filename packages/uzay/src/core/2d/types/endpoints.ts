// How the end of a curve-like item is drawn where it stops at a boundary.
// "closed" is a filled dot (the value is attained), "open" is a hollow ring
// (the value is approached but excluded). Shared by items that terminate
// curves at exact positions: function graphs today, interval-style segments
// as they adopt it.
export type EndpointStyle = "open" | "closed";
