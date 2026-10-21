/** Central registry of query keys so invalidation stays consistent. */
export const queryKeys = {
  walls: ['walls'] as const,
  wall: (id: string) => ['walls', id] as const,
  photo: (id: string) => ['photos', id] as const,
}
