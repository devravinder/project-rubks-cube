import { useEffect, useState } from 'react'
import { FACE_COLOR } from '../cube/facelet'
import { useCubeStore } from '../store/cubeStore'
import { type Face } from '../cube/facelet'
import type { MoveName } from '../cube/moves'


type GuideCircle = { cx: number; cy: number; r: number }
const GUIDE_CIRCLES: Array<GuideCircle> = [
  { cx: 50, cy: 38.85, r: 24.3 },
  { cx: 50, cy: 38.85, r: 29.7 },
  { cx: 50, cy: 38.85, r: 35.1 },
  { cx: 64.85, cy: 64.57, r: 24.3 },
  { cx: 64.85, cy: 64.57, r: 29.7 },
  { cx: 64.85, cy: 64.57, r: 35.1 },
  { cx: 35.15, cy: 64.57, r: 24.3 },
  { cx: 35.15, cy: 64.57, r: 29.7 },
  { cx: 35.15, cy: 64.57, r: 35.1 },
]

type NodePos = { faceletIndex: number; x: number; y: number; face: Face, label?: string }
const INITIAL_NODES: NodePos[] = [
  { faceletIndex: 0, face: 'U', x: 50, y: 45.34 },
  { faceletIndex: 1, face: 'U', x: 54.91, y: 42.4 },
  { faceletIndex: 2, face: 'U', x: 60.8, y: 40.61 },
  { faceletIndex: 3, face: 'U', x: 45.09, y: 42.4 },
  { faceletIndex: 4, face: 'U', x: 50, y: 38.85, label : 'U' },
  { faceletIndex: 5, face: 'U', x: 55.89, y: 36.26 },
  { faceletIndex: 6, face: 'U', x: 39.2, y: 40.61 },
  { faceletIndex: 7, face: 'U', x: 44.11, y: 36.26 },
  { faceletIndex: 8, face: 'U', x: 50, y: 32.77 },
  { faceletIndex: 9, face: 'R', x: 59.23, y: 61.33 },
  { faceletIndex: 10, face: 'R', x: 59.32, y: 67.05 },
  { faceletIndex: 11, face: 'R', x: 57.93, y: 73.05 },
  { faceletIndex: 12, face: 'R', x: 64.23, y: 58.55 },
  { faceletIndex: 13, face: 'R', x: 64.85, y: 64.57, label:'R' },
  { faceletIndex: 14, face: 'R', x: 64.15, y: 70.97 },
  { faceletIndex: 15, face: 'R', x: 68.73, y: 54.34 },
  { faceletIndex: 16, face: 'R', x: 70.04, y: 60.77 },
  { faceletIndex: 17, face: 'R', x: 70.12, y: 67.62 },
  { faceletIndex: 18, face: 'F', x: 40.77, y: 61.33 },
  { faceletIndex: 19, face: 'F', x: 35.77, y: 58.55 },
  { faceletIndex: 20, face: 'F', x: 31.27, y: 54.34 },
  { faceletIndex: 21, face: 'F', x: 40.68, y: 67.05 },
  { faceletIndex: 22, face: 'F', x: 35.15, y: 64.57, label:'F' },
  { faceletIndex: 23, face: 'F', x: 29.96, y: 60.77 },
  { faceletIndex: 24, face: 'F', x: 42.07, y: 73.05 },
  { faceletIndex: 25, face: 'F', x: 35.85, y: 70.97 },
  { faceletIndex: 26, face: 'F', x: 29.88, y: 67.62 },
  { faceletIndex: 27, face: 'D', x: 50, y: 83.81 },
  { faceletIndex: 28, face: 'D', x: 45.09, y: 86.75 },
  { faceletIndex: 29, face: 'D', x: 39.2, y: 88.53 },
  { faceletIndex: 30, face: 'D', x: 54.91, y: 86.75 },
  { faceletIndex: 31, face: 'D', x: 50, y: 90.29, label:'D' },
  { faceletIndex: 32, face: 'D', x: 44.11, y: 92.89 },
  { faceletIndex: 33, face: 'D', x: 60.8, y: 88.53 },
  { faceletIndex: 34, face: 'D', x: 55.89, y: 92.89 },
  { faceletIndex: 35, face: 'D', x: 50, y: 96.38 },
  { faceletIndex: 36, face: 'L', x: 25.92, y: 42.1 },
  { faceletIndex: 37, face: 'L', x: 25.83, y: 36.37 },
  { faceletIndex: 38, face: 'L', x: 27.22, y: 30.38 },
  { faceletIndex: 39, face: 'L', x: 20.92, y: 44.88 },
  { faceletIndex: 40, face: 'L', x: 20.3, y: 38.85, label:'L' },
  { faceletIndex: 41, face: 'L', x: 21, y: 32.45 },
  { faceletIndex: 42, face: 'L', x: 16.42, y: 49.09 },
  { faceletIndex: 43, face: 'L', x: 15.11, y: 42.66 },
  { faceletIndex: 44, face: 'L', x: 15.03, y: 35.81 },
  { faceletIndex: 45, face: 'B', x: 74.08, y: 42.1 },
  { faceletIndex: 46, face: 'B', x: 79.08, y: 44.88 },
  { faceletIndex: 47, face: 'B', x: 83.58, y: 49.09 },
  { faceletIndex: 48, face: 'B', x: 74.17, y: 36.37 },
  { faceletIndex: 49, face: 'B', x: 79.7, y: 38.85, label:'B' },
  { faceletIndex: 50, face: 'B', x: 84.89, y: 42.66 },
  { faceletIndex: 51, face: 'B', x: 72.78, y: 30.38 },
  { faceletIndex: 52, face: 'B', x: 79, y: 32.45 },
  { faceletIndex: 53, face: 'B', x: 84.97, y: 35.81 },
]


const NODE_RADIUS = 2.4
const VIEW_SIZE = 100

const ROTATION_CIRCLES = {
  // initial nodes indices
  'U': {
    'FACE': [8, 5, 2, 1, 0, 3, 6, 7],
    'INNER': [
      51, 48, 45,
      15, 12, 9,
      18, 19, 20,
      36, 37, 38
    ],
  },
  'D': {
    'FACE': [29, 28, 27, 30, 33, 34, 35, 32],
    'INNER': [
      26, 25, 24,
      11, 14, 17,
      47, 50, 53,
      44, 43, 42
    ]
  },
  'R': {
    'FACE': [17, 14, 11, 10, 9, 12, 15, 16],
    'INNER': [
      33, 30, 27,
      24, 21, 18,
      0, 1, 2,
      45, 46, 47
    ]
  },
  'L': {
    'FACE': [36, 39, 42, 43, 44, 41, 38, 37],
    'INNER': [
      20, 23, 26,
      29, 32, 35,
      53, 52, 51,
      8, 7, 6
    ]
  },
  'F': {
    'FACE': [26, 23, 20, 19, 18, 21, 24, 25],
    'INNER': [
      42, 39, 36,
      6, 3, 0,
      9, 10, 11,
      27, 28, 29
    ],
  },
  'B': {
    'FACE': [47, 46, 45, 48, 51, 52, 53, 50],
    'INNER': [
      17, 16, 15,
      2, 5, 8,
      38, 41, 44,
      35, 34, 33
    ]
  }

}

const getInitialNodes=()=> structuredClone(INITIAL_NODES)

export function Graph2D() {
  const lastMove = useCubeStore((s) => s.lastMove)
  const history = useCubeStore((s)=> s.history)
  const [nodes, setNodes] = useState(() => getInitialNodes())
  const circles = GUIDE_CIRCLES


  const moveFaceClockwise = (arr: number[], nodes: NodePos[]) => {
    const POSITIONS_TO_MOVE = 2
    const indicesToUpdate = arr.map((_, index) => arr.at(index - POSITIONS_TO_MOVE)!)
    const newValues = indicesToUpdate.map(index => nodes[index].face)
    arr.forEach((index, i) => nodes[index].face = newValues[i])

    return nodes

  }

  const moveFaceCounterClockwise = (arr: number[], nodes: NodePos[]) => {

    const POSITIONS_TO_MOVE = 2
    const arrLength = arr.length;
    const indicesToUpdate = arr.map((_, index) => arr.at((index + POSITIONS_TO_MOVE) % arrLength)!)
    const newValues = indicesToUpdate.map(index => nodes[index].face)
    arr.forEach((index, i) => nodes[index].face = newValues[i])

    return nodes

  }

  const moveCircleClockwise = (arr: number[], nodes: NodePos[]) => {
    const POSITIONS_TO_MOVE = 3
    const indicesToUpdate = arr.map((_, index) => arr.at(index - POSITIONS_TO_MOVE)!)
    const newValues = indicesToUpdate.map(index => nodes[index].face)
    arr.forEach((index, i) => nodes[index].face = newValues[i])

    return nodes

  }

  const moveCircleCounterClockwise = (arr: number[], nodes: NodePos[]) => {

    const POSITIONS_TO_MOVE = 3
    const arrLength = arr.length;
    const indicesToUpdate = arr.map((_, index) => arr.at((index + POSITIONS_TO_MOVE) % arrLength)!)
    const newValues = indicesToUpdate.map(index => nodes[index].face)
    arr.forEach((index, i) => nodes[index].face = newValues[i])

    return nodes

  }

  const cw = (g: { FACE: number[]; INNER: number[] }, n: NodePos[]) => moveCircleClockwise(g.INNER, moveFaceClockwise(g.FACE, n))
  const ccw = (g: { FACE: number[]; INNER: number[] }, n: NodePos[]) => moveCircleCounterClockwise(g.INNER, moveFaceCounterClockwise(g.FACE, n))
  const twice = (g: { FACE: number[]; INNER: number[] }, n: NodePos[]) => cw(g, cw(g, n))

  const applyMoveToNodes = (move: MoveName, nodes: NodePos[]): NodePos[] => {
    const U = ROTATION_CIRCLES.U
    const R = ROTATION_CIRCLES.R
    const F = ROTATION_CIRCLES.F
    const D = ROTATION_CIRCLES.D
    const L = ROTATION_CIRCLES.L
    const B = ROTATION_CIRCLES.B


    switch (move) {
      case 'U':
        return cw(U, nodes)
      case "U'":
        return ccw(U, nodes)
      case 'U2':
        return twice(U, nodes)

      case 'D':
        return cw(D, nodes)
      case "D'":
        return ccw(D, nodes)
      case 'D2':
        return twice(D, nodes)

      case 'R':
        return cw(R, nodes)
      case "R'":
        return ccw(R, nodes)
      case 'R2':
        return twice(R, nodes)

      case 'L':
        return cw(L, nodes)
      case "L'":
        return ccw(L, nodes)
      case 'L2':
        return twice(L, nodes)

      case 'F':
        return cw(F, nodes)
      case "F'":
        return ccw(F, nodes)
      case 'F2':
        return twice(F, nodes)

      case 'B':
        return cw(B, nodes)
      case "B'":
        return ccw(B, nodes)
      case 'B2':
        return twice(B, nodes)

      default:
        return nodes
    }
  }

  const applyMove = (move: MoveName) => {
    const newNodes = applyMoveToNodes(move, nodes);
    setNodes([...newNodes])
  }

  const applyHistory = (moves: MoveName[])=>{
    let updatedNodes = getInitialNodes()
    for(let move of moves){
          updatedNodes = applyMoveToNodes(move, updatedNodes)
    }
    setNodes([...updatedNodes])
  }

  useEffect(() => {
    // history, reset & undo
    if(!lastMove){
         applyHistory(history)
       }
  }, [history, lastMove])
  

  useEffect(() => {

    // move 
    if (lastMove){
      applyMove(lastMove)
    }
  }, [lastMove])

  return (
    <svg
      viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="2D graph view (layout)"
    >
      {/* Guide circles (the concentric tracks). */}
      <g className="text-border" stroke="currentColor" fill="none" strokeWidth={0.5}>
        {circles.map((c, i) => (
          <circle key={i} cx={c.cx} cy={c.cy} r={c.r} />
        ))}
      </g>

      <g>
        {nodes.map((node) => {
          return (
            <g key={node.faceletIndex}>
              <circle
                cx={node.x}
                cy={node.y}
                r={NODE_RADIUS}
                fill={FACE_COLOR[node.face]}
                stroke="rgba(0,0,0,0.4)"
                strokeWidth={0.25}
              />
              <text
                x={node.x}
                y={node.y}
                dy="0.1em"
                fontSize="3"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="rgba(0,0,0,0.7)"
              >
                {node.label}
                {/* {node.faceletIndex} // use this while debugging */}
              </text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}
