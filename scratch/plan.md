const fs = require('fs');

// We have scratch/fast_centerline_tracer.js that rasterized the road mask
// Let's create an interactive or progressive tracer with BFS/Dijkstra on the grid!
// In a 2D grid, we know start is at X = -60, Z = -2.
// Let's find path of cells from start around the loop back to start!
