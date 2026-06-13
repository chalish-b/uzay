export type ItemTags = Array<string>;

// Camera-scoped visibility test, shared by the 2D and 3D views.
//
// A camera's `visibleTags` decides which items it renders:
//   - undefined  -> the camera has no filter and shows everything
//   - []         -> the camera shows only untagged items
//   - [...tags]  -> the camera shows untagged items plus any item whose tags
//                   intersect the list
//
// Untagged items are universal: they appear under every camera. This keeps
// shared scaffolding (axes, grids, a common readout) visible in all panels
// while only the panel-specific items carry tags.
export function cameraShowsTags(
  visibleTags: ItemTags | undefined,
  itemTags: ItemTags
): boolean {
  if (visibleTags === undefined) return true;
  if (itemTags.length === 0) return true;
  return itemTags.some((tag) => visibleTags.includes(tag));
}
