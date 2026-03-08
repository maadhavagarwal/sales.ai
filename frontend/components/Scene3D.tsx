"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import { Float, Sphere, Instances, Instance, Line, Text3D, Center, Sparkles, MeshTransmissionMaterial } from "@react-three/drei"
import * as THREE from "three"
import { EffectComposer, Bloom } from "@react-three/postprocessing"

// Generate random data points for the 3D network graph
const nodeCount = 40
const nodes = Array.from({ length: nodeCount }).map(() => ({
    pos: new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 6 - 2
    ),
    scale: Math.random() * 0.4 + 0.1,
    color: Math.random() > 0.5 ? "#6366f1" : "#06b6d4" // indigo or cyan
}))

// Connect nearest neighbors to form a graph
const lines: Array<[THREE.Vector3, THREE.Vector3]> = []
for (let i = 0; i < nodeCount; i++) {
    for (let j = i + 1; j < nodeCount; j++) {
        if (nodes[i].pos.distanceTo(nodes[j].pos) < 3.5) {
            lines.push([nodes[i].pos, nodes[j].pos])
        }
    }
}

function DataNetwork() {
    const groupRef = useRef<THREE.Group>(null)

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.05
            groupRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.1) * 0.1
        }
    })

    return (
        <group ref={groupRef}>
            {/* Edges */}
            {lines.map((line, idx) => (
                <Line
                    key={idx}
                    points={line}
                    color="#3730a3"
                    opacity={0.15}
                    transparent
                    lineWidth={1}
                />
            ))}

            {/* Nodes */}
            <Instances limit={nodeCount}>
                <sphereGeometry args={[1, 16, 16]} />
                <meshStandardMaterial emissiveIntensity={0.5} roughness={0.2} metalness={0.8} />
                {nodes.map((node, i) => (
                    <Instance
                        key={i}
                        position={node.pos}
                        scale={node.scale}
                        color={node.color}
                    />
                ))}
            </Instances>
        </group>
    )
}

function CentralCore() {
    const coreRef = useRef<THREE.Mesh>(null)

    useFrame((state) => {
        if (coreRef.current) {
            coreRef.current.rotation.y = state.clock.getElapsedTime() * -0.2
            coreRef.current.rotation.x = state.clock.getElapsedTime() * 0.1
        }
    })

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
            <mesh ref={coreRef} position={[0, 0, 0]} scale={1.5}>
                <octahedronGeometry args={[1.5, 0]} />
                <MeshTransmissionMaterial
                    backside
                    samples={4}
                    thickness={2}
                    chromaticAberration={0.5}
                    anisotropy={0.1}
                    distortion={0.2}
                    distortionScale={0.3}
                    temporalDistortion={0.1}
                    clearcoat={1}
                    attenuationDistance={0.5}
                    attenuationColor="#6366f1"
                    color="#ffffff"
                />
            </mesh>
            {/* Core Energy */}
            <Sphere args={[0.8, 32, 32]}>
                <meshBasicMaterial color="#06b6d4" />
            </Sphere>
        </Float>
    )
}

function FloatingMetrics() {
    // We don't have a font file locally guaranteed, so we will use basic shapes/cards instead,
    // or simple HTML annotations (drei Html) if we wanted text. For a clean look, 
    // we'll stick to abstract Data shapes representing data packets moving.
    const group = useRef<THREE.Group>(null)

    useFrame((state) => {
        if (group.current) {
            group.current.children.forEach((child, i) => {
                child.position.y += Math.sin(state.clock.getElapsedTime() * 2 + i) * 0.01
                child.rotation.y += 0.01
                child.rotation.x += 0.01
            })
        }
    })

    return (
        <group ref={group}>
            <mesh position={[-3, 2, 1]}>
                <boxGeometry args={[0.6, 0.6, 0.6]} />
                <meshStandardMaterial color="#8b5cf6" wireframe />
            </mesh>
            <mesh position={[4, -2, -1]}>
                <coneGeometry args={[0.4, 0.8, 4]} />
                <meshStandardMaterial color="#f43f5e" wireframe />
            </mesh>
            <mesh position={[2, 3, -2]}>
                <torusGeometry args={[0.3, 0.1, 16, 32]} />
                <meshStandardMaterial color="#10b981" />
            </mesh>
        </group>
    )
}

export default function Scene3D() {
    return (
        <>
            <ambientLight intensity={0.2} />
            <pointLight position={[10, 10, 10]} intensity={1.5} color="#818cf8" />
            <pointLight position={[-10, -10, -10]} intensity={0.8} color="#06b6d4" />

            <Sparkles count={400} scale={15} size={2} speed={0.4} opacity={0.3} color="#c7d2fe" />

            <CentralCore />
            <DataNetwork />
            <FloatingMetrics />

            <EffectComposer>
                <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={1.2} />
            </EffectComposer>
        </>
    )
}
