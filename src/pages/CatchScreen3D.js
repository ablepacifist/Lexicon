/**
 * CatchScreen3D — True 3D Pokemon catch screen using Three.js (WebGL).
 *
 * World coordinate system:
 *   X = left/right  (positive = right)
 *   Y = up/down     (positive = up, ground at Y=0)
 *   Z = depth       (positive = forward, away from camera)
 *
 * Physics runs in 3D world space. Perspective projection is handled by
 * THREE.PerspectiveCamera — the ball naturally shrinks as Z increases.
 * Gravity pulls the ball down (negative Y) every frame.
 * Hit detection is a 3D sphere-sphere distance check.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { getApiUrls } from '../utils/apiUrls';

const { pokemonApiUrl } = getApiUrls();

// ── Physics constants (world units = metres) ──────────────────────────────────
const GRAVITY       = 9.8;   // m/s² downward
const BALL_RADIUS   = 0.12;  // metres — physical radius of pokeball
const CAMERA_Y      = 1.55;  // metres — player eye height
const THROW_TIME    = 0.90;  // seconds — baseline flight time to reach Pokemon
const FOV           = 52;    // degrees — camera field of view

// ── Species physical data [height_m, hitbox_radius_m] ────────────────────────
const SPECIES_PHYS = {
    Snorlax:[2.1,1.20], Wailord:[4.7,2.80], Dragonite:[2.2,1.10], Onix:[8.8,0.90],
    Lapras:[2.5,1.20],  Rhydon:[1.9,1.00],  Venusaur:[2.0,1.00],
    Charizard:[1.7,0.90], Blastoise:[1.6,0.90], Gyarados:[6.5,1.40],
    Arcanine:[1.9,1.00], Clefairy:[0.6,0.50], Jigglypuff:[0.5,0.48],
    Pikachu:[0.4,0.44],  Eevee:[0.3,0.42],   Pidgey:[0.3,0.40],
    Zubat:[0.8,0.42],    Rattata:[0.3,0.38],  Caterpie:[0.3,0.36],
    Weedle:[0.3,0.36],
};

const BALLS = [
    { type: 'POKEBALL',   label: 'Poké Ball',  sprite: 'pokeball_sprite.png',  color: '#ef4444' },
    { type: 'GREAT_BALL', label: 'Great Ball', sprite: 'greatball_sprite.png', color: '#3b82f6' },
    { type: 'ULTRA_BALL', label: 'Ultra Ball', sprite: 'ultraball_sprite.png', color: '#f59e0b' },
];
const BALL_SPRITE_MAP = {
    POKEBALL: 'pokeball_sprite.png', GREAT_BALL: 'greatball_sprite.png', ULTRA_BALL: 'ultraball_sprite.png'
};

const BERRIES = [
    { type: 'RAZZ_BERRY',  emoji: '🍓', label: 'Razz',  desc: '1.5× catch' },
    { type: 'NANAB_BERRY', emoji: '🍌', label: 'Nanab', desc: 'No dodge'   },
    { type: 'PINAP_BERRY', emoji: '🍍', label: 'Pinap', desc: '2× candy'   },
];

/** Map real-world distance (metres) → 3D world Z (metres) */
function pokemonWorldZ(distM) {
    // Near (0m real) → Z=3, Far (200m real) → Z=28
    return 3.0 + (Math.min(distM, 200) / 200) * 25.0;
}

// ── CSS keyframes injected once ───────────────────────────────────────────────
const STYLE_ID = 'catch3d-keyframes';
if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
        @keyframes c3dTierPop  { 0%{transform:scale(0.35) translateY(12px);opacity:0} 55%{transform:scale(1.18) translateY(-5px);opacity:1} 100%{transform:scale(1) translateY(0);opacity:1} }
        @keyframes c3dBounce   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes c3dResultPop{ 0%{transform:scale(0.4);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
    `;
    document.head.appendChild(s);
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CatchScreen3D({
    spawn, items, selectedBall, onSelectBall,
    throwing, shaking, catchResult,
    onThrow, onMiss, onClose, onTryAgain,
}) {
    const canvasRef         = useRef(null);
    const rafRef            = useRef(null);
    const selectedBerryRef  = useRef(null);
    const [displayBerry, setDisplayBerry] = useState(null);

    // Three.js objects — created once per spawn
    const threeRef = useRef(null); // { renderer, scene, camera, ball, ring, pokemon, shadow }

    // Physics state — mutated inside rAF, never triggers React re-render
    const physRef = useRef({
        flying:    false,
        pos:       new THREE.Vector3(0, 0.5, 0.4),
        vel:       new THREE.Vector3(0, 0, 0),
        ringScale: 1.0,    // 1 = full size, 0 = tiny
        ringDir:   -1,     // -1 shrinking, +1 growing
        ringBonus: 0,
        spinDir:   0,
    });

    // Mutable prop mirrors — read inside rAF without stale closure
    const propsRef = useRef({ throwing, shaking, catchResult, onThrow, onMiss });
    useEffect(() => {
        propsRef.current = { throwing, shaking, catchResult, onThrow, onMiss };
    });

    // Input
    const swipeRef     = useRef(null);
    const spinTrailRef = useRef([]);
    const windRef      = useRef(0);       // random lateral wind force m/s²
    const attackRef    = useRef(false);
    const attackTimer  = useRef(null);

    // Pokemon dodge state (mutated inside rAF)
    const pokeXRef       = useRef(0);     // current world X of Pokemon
    const pokeTargetXRef = useRef(0);     // where it's dodging to
    const dodgedRef      = useRef(false); // one dodge attempt per throw

    // UI state
    const [throwTier,   setThrowTier]   = useState('');
    const [spinGlow,    setSpinGlow]    = useState(false);
    const [blocked,     setBlocked]     = useState(false);
    const [attackAnim,  setAttackAnim]  = useState(false);
    const [ballVisible, setBallVisible] = useState(true);
    const [dodgeFlash,  setDodgeFlash]  = useState(false);

    const distM   = spawn?.distanceM || 50;
    const pZ      = pokemonWorldZ(distM);
    const [specH, specHitR] = SPECIES_PHYS[spawn?.speciesName] || [1.0, 0.60];
    const ballSprite    = BALL_SPRITE_MAP[selectedBall] || BALLS[0].sprite;
    const selBallDef    = BALLS.find(b => b.type === selectedBall) || BALLS[0];
    const diffLabel     = distM < 30 ? '🟢 Easy' : distM < 80 ? '🟡 Medium' : distM < 150 ? '🟠 Hard' : '🔴 Expert';

    // ── Build Three.js scene ──────────────────────────────────────────────────
    useEffect(() => {
        if (!spawn || !canvasRef.current) return;

        const canvas = canvasRef.current;
        // Canvas must have explicit pixel dimensions
        const W = canvas.offsetWidth  || window.innerWidth;
        const H = canvas.offsetHeight || window.innerHeight;
        canvas.width  = W * window.devicePixelRatio;
        canvas.height = H * window.devicePixelRatio;

        // ── Renderer ──────────────────────────────────────────────────────────
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(W, H, false);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // ── Scene ─────────────────────────────────────────────────────────────
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x7ec8e3);
        scene.fog = new THREE.Fog(0xb8dff0, pZ * 1.4, pZ * 3);

        // ── Camera ────────────────────────────────────────────────────────────
        const camera = new THREE.PerspectiveCamera(FOV, W / H, 0.05, 500);
        camera.position.set(0, CAMERA_Y, 0);
        camera.lookAt(0, specH * 0.45, pZ);

        // ── Lighting ─────────────────────────────────────────────────────────
        scene.add(new THREE.AmbientLight(0xffeedd, 0.75));
        const sun = new THREE.DirectionalLight(0xfffbe0, 1.3);
        sun.position.set(10, 20, -5);
        sun.castShadow = true;
        sun.shadow.mapSize.width  = 1024;
        sun.shadow.mapSize.height = 1024;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far  = 80;
        sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
        sun.shadow.camera.top  =  30; sun.shadow.camera.bottom = -30;
        scene.add(sun);

        // ── Ground plane ─────────────────────────────────────────────────────
        // Large green grass plane — the Z axis goes forward (into screen), X goes sideways.
        // This is the "floor plane" in true 3D world space.
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(120, 120),
            new THREE.MeshLambertMaterial({ color: 0x4caf50 })
        );
        ground.rotation.x = -Math.PI / 2; // rotate flat (XZ plane)
        ground.receiveShadow = true;
        scene.add(ground);

        // Grid on ground — perspective lines give strong depth perception
        const grid = new THREE.GridHelper(120, 60, 0x2e7d32, 0x388e3c);
        grid.position.y = 0.005;
        scene.add(grid);

        // ── Background hills ─────────────────────────────────────────────────
        const hillMat = new THREE.MeshLambertMaterial({ color: 0x388e3c });
        [[-25,0,pZ+18],[25,0,pZ+18],[0,0,pZ+30],[-40,0,pZ+25],[40,0,pZ+25]].forEach(([x,,z]) => {
            const hill = new THREE.Mesh(new THREE.SphereGeometry(7, 10, 7), hillMat);
            hill.position.set(x, -5, z);
            scene.add(hill);
        });

        // ── Sky gradient (simple hemisphere) ─────────────────────────────────
        scene.add(new THREE.HemisphereLight(0x87ceeb, 0x3a5f3a, 0.4));

        // ── Loader ───────────────────────────────────────────────────────────
        const loader = new THREE.TextureLoader();

        // ── Pokemon billboard sprite ──────────────────────────────────────────
        // THREE.Sprite always faces the camera — a 2D texture in true 3D world space.
        // Its screen size is automatically determined by the perspective camera based
        // on its world Z distance. No fake scaling — real 3D perspective.
        const pokeTex = loader.load(`${pokemonApiUrl}/api/pokemon/sprites/${spawn.spriteKey}`);
        pokeTex.colorSpace = THREE.SRGBColorSpace;
        const pokemon = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: pokeTex, transparent: true, alphaTest: 0.08 })
        );
        const spriteW = specH * 2.4;
        pokemon.scale.set(spriteW, spriteW * 1.1, 1);
        pokemon.position.set(0, specH * 0.55, pZ);
        scene.add(pokemon);

        // Pokemon ground shadow (circle on plane)
        const shadowMesh = new THREE.Mesh(
            new THREE.CircleGeometry(specH * 0.45, 32),
            new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 })
        );
        shadowMesh.rotation.x = -Math.PI / 2;
        shadowMesh.position.set(0, 0.01, pZ);
        scene.add(shadowMesh);

        // ── Catch ring ────────────────────────────────────────────────────────
        // A RingGeometry (donut) in 3D world space, billboard facing camera.
        // It shrinks over time — this is the bonus ring the player times their throw to.
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(specH * 0.50, specH * 0.56, 80),
            new THREE.MeshBasicMaterial({ color: 0xff2222, side: THREE.DoubleSide, transparent: true, opacity: 0.88 })
        );
        ring.position.set(0, specH * 0.55, pZ - 0.06);
        // Make ring face the camera (billboard). We rotate it so its normal points toward cam.
        ring.lookAt(0, specH * 0.55, -100);
        scene.add(ring);

        // ── Pokeball mesh ─────────────────────────────────────────────────────
        // A real sphere in 3D world space. Its size on screen is determined by its
        // actual Z distance from the camera — real perspective. No fake CSS scaling.
        const ballTex = loader.load(`${pokemonApiUrl}/api/pokemon/item-sprites/${ballSprite}`);
        ballTex.colorSpace = THREE.SRGBColorSpace;
        const ball = new THREE.Mesh(
            new THREE.SphereGeometry(BALL_RADIUS, 28, 28),
            new THREE.MeshLambertMaterial({ map: ballTex })
        );
        ball.castShadow = true;
        // Resting position: player's hand in front of camera at eye level
        ball.position.set(0, 0.5, 0.4);
        scene.add(ball);

        // ── Throw trail (line strip) ──────────────────────────────────────────
        const trailPoints = Array(12).fill(null).map(() => new THREE.Vector3(0, -100, 0));
        const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPoints);
        const trail = new THREE.Line(
            trailGeo,
            new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, linewidth: 2 })
        );
        scene.add(trail);
        const trailPositions = [];

        // ── Store refs ────────────────────────────────────────────────────────
        threeRef.current = { renderer, scene, camera, ball, ring, pokemon, shadowMesh, trail, trailGeo, trailPositions };

        // Reset physics
        const phys = physRef.current;
        phys.flying    = false;
        phys.pos.set(0, 0.5, 0.4);
        phys.vel.set(0, 0, 0);
        phys.ringScale = 1.0;
        phys.ringDir   = -1;
        setBallVisible(true);
        windRef.current    = (Math.random() - 0.5) * 1.6; // random wind per encounter
        pokeXRef.current   = 0;
        pokeTargetXRef.current = 0;
        dodgedRef.current  = false;

        // ── Render loop ───────────────────────────────────────────────────────
        let lastT = null;
        function animate(ts) {
            rafRef.current = requestAnimationFrame(animate);
            const dt = lastT ? Math.min((ts - lastT) / 1000, 0.04) : 0;
            lastT = ts;

            const { catchResult: cr, shaking: sh } = propsRef.current;

            // ── Ring animation ────────────────────────────────────────────────
            if (!cr && !sh) {
                phys.ringScale += phys.ringDir * 0.38 * dt;
                if (phys.ringScale <= 0.05) { phys.ringScale = 0.05; phys.ringDir = 1; }
                if (phys.ringScale >= 1.0)  { phys.ringScale = 1.0;  phys.ringDir = -1; }
                ring.scale.set(phys.ringScale, phys.ringScale, 1);
                // Color shifts red→orange→yellow→green as ring shrinks
                const t = 1 - phys.ringScale;
                ring.material.color.setRGB(1, t * 0.65, t * 0.05);
                ring.visible = true;
            } else {
                ring.visible = false;
            }

            // ── Ball physics ──────────────────────────────────────────────────
            if (phys.flying) {
                // Integrate 3D velocity with gravity and wind
                phys.vel.y -= GRAVITY     * dt;   // gravity (Y axis, downward)
                phys.vel.x += windRef.current * dt; // lateral wind (X axis)
                // Magnus effect for curveball (lateral force perpendicular to forward)
                phys.vel.x += phys.spinDir * 2.2  * dt;

                phys.pos.x += phys.vel.x * dt;
                phys.pos.y += phys.vel.y * dt;
                phys.pos.z += phys.vel.z * dt;

                ball.position.copy(phys.pos);

                // Ball rotates around its local axis as it flies
                ball.rotation.x += phys.vel.z * 2.5 * dt;
                ball.rotation.z -= phys.vel.x * 2.0 * dt;

                // Update throw trail
                trailPositions.push(phys.pos.clone());
                if (trailPositions.length > 18) trailPositions.shift();
                const pts = trailPositions.map(p => p);
                while (pts.length < 2) pts.push(pts[0] || new THREE.Vector3());
                trailGeo.setFromPoints(pts);
                trailGeo.needsUpdate = true;

                // ── Pokemon dodge ─────────────────────────────────────────────
                // When ball is halfway to Pokemon, 28% chance it sidesteps.
                if (!dodgedRef.current && phys.pos.z > pZ * 0.45) {
                    dodgedRef.current = true;
                    if (Math.random() < 0.28) {
                        pokeTargetXRef.current = (Math.random() > 0.5 ? 1 : -1) * (2.0 + Math.random() * 1.5);
                        setDodgeFlash(true);
                        setTimeout(() => setDodgeFlash(false), 700);
                    }
                }

                // ── Hit detection: 3D sphere vs sphere using actual Pokemon X ─
                const pokeCenter = new THREE.Vector3(pokeXRef.current, specH * 0.55, pZ);
                const dist3D = phys.pos.distanceTo(pokeCenter);

                if (dist3D < specHitR + BALL_RADIUS) {
                    // ── HIT ──────────────────────────────────────────────────
                    phys.flying = false;
                    trailPositions.length = 0;
                    dodgedRef.current = false;
                    ball.position.copy(pokeCenter);

                    const bonus = 1 - phys.ringScale;
                    const tier  = bonus >= 0.90 ? 'Excellent' : bonus >= 0.70 ? 'Great' : bonus >= 0.40 ? 'Nice' : '';
                    if (tier) setThrowTier(tier);
                    const berry = selectedBerryRef.current;
                    selectedBerryRef.current = null;
                    setDisplayBerry(null);
                    propsRef.current.onThrow(bonus, berry);
                    return;
                }

                // ── Ground collision: ball bounces on the floor plane (Y=0) ──
                if (phys.pos.y < BALL_RADIUS) {
                    phys.pos.y    = BALL_RADIUS;
                    phys.vel.y    = -phys.vel.y * 0.30;
                    phys.vel.x   *= 0.60;
                    phys.vel.z   *= 0.60;
                    if (Math.abs(phys.vel.y) < 0.4) {
                        phys.flying = false;
                        trailPositions.length = 0;
                        dodgedRef.current = false;
                        setTimeout(() => {
                            ball.position.set(0, 0.5, 0.4);
                            setBallVisible(true);
                            propsRef.current.onMiss();
                        }, 500);
                    }
                    ball.position.copy(phys.pos);
                }

                // ── Overshot ──────────────────────────────────────────────────
                if (phys.pos.z > pZ + 4 || Math.abs(phys.pos.x) > 15 || phys.pos.z < -1) {
                    phys.flying = false;
                    trailPositions.length = 0;
                    dodgedRef.current = false;
                    setTimeout(() => {
                        ball.position.set(0, 0.5, 0.4);
                        setBallVisible(true);
                        propsRef.current.onMiss();
                    }, 300);
                }
            } else {
                // When not flying, reset dodge target back to center
                if (Math.abs(pokeTargetXRef.current) > 0.01) {
                    pokeTargetXRef.current *= 0.93;
                }
            }

            // ── Pokemon X-axis dodge lerp ─────────────────────────────────────
            const currX = pokeXRef.current;
            const targX = pokeTargetXRef.current;
            if (Math.abs(currX - targX) > 0.005) {
                pokeXRef.current += (targX - currX) * Math.min(1, dt * 6);
                pokemon.position.x   = pokeXRef.current;
                ring.position.x      = pokeXRef.current;
                shadowMesh.position.x = pokeXRef.current;
            }

            // ── Pokemon idle bob (Y oscillation) ─────────────────────────────
            if (!cr) {
                pokemon.position.y = specH * 0.55 + Math.sin(ts * 0.002) * 0.07;
                shadowMesh.material.opacity = 0.28 - Math.sin(ts * 0.002) * 0.06;
            }

            renderer.render(scene, camera);
        }
        animate(0);

        // Resize handler
        function onResize() {
            const cw = canvas.offsetWidth;
            const ch = canvas.offsetHeight;
            canvas.width  = cw * window.devicePixelRatio;
            canvas.height = ch * window.devicePixelRatio;
            camera.aspect = cw / ch;
            camera.updateProjectionMatrix();
            renderer.setSize(cw, ch, false);
        }
        window.addEventListener('resize', onResize);

        return () => {
            cancelAnimationFrame(rafRef.current);
            window.removeEventListener('resize', onResize);
            renderer.dispose();
            threeRef.current = null;
        };
    }, [spawn]); // eslint-disable-line react-hooks/exhaustive-deps

    // Update ball texture when selected ball changes
    useEffect(() => {
        if (!threeRef.current) return;
        const loader = new THREE.TextureLoader();
        const tex = loader.load(`${pokemonApiUrl}/api/pokemon/item-sprites/${ballSprite}`);
        tex.colorSpace = THREE.SRGBColorSpace;
        threeRef.current.ball.material.map = tex;
        threeRef.current.ball.material.needsUpdate = true;
    }, [selectedBall, ballSprite]);

    // ── Pokemon attack scheduler ──────────────────────────────────────────────
    useEffect(() => {
        if (!spawn || catchResult || shaking) { clearTimeout(attackTimer.current); return; }
        function schedule() {
            attackTimer.current = setTimeout(() => {
                if (attackRef.current) { schedule(); return; }
                attackRef.current = true;
                setAttackAnim(true);
                if (threeRef.current?.pokemon) {
                    threeRef.current.pokemon.material.color.set(0xff4444);
                }
                setTimeout(() => {
                    attackRef.current = false;
                    setAttackAnim(false);
                    if (threeRef.current?.pokemon) {
                        threeRef.current.pokemon.material.color.set(0xffffff);
                    }
                    schedule();
                }, 1300);
            }, 5000 + Math.random() * 4000);
        }
        schedule();
        return () => clearTimeout(attackTimer.current);
    }, [spawn, catchResult, shaking]);

    // ── Curveball / spin detection ────────────────────────────────────────────
    function detectSpin(trail) {
        if (trail.length < 8) return 0;
        let cross = 0;
        for (let i = 1; i < trail.length - 1; i++) {
            const ax = trail[i].x - trail[i-1].x, ay = trail[i].y - trail[i-1].y;
            const bx = trail[i+1].x - trail[i].x, by = trail[i+1].y - trail[i].y;
            cross += ax * by - ay * bx;
        }
        if (Math.abs(cross) < 1200) return 0;
        return cross > 0 ? 1 : -1;
    }

    // ── Pointer input ─────────────────────────────────────────────────────────
    function handlePointerDown(e) {
        if (throwing || shaking || catchResult || !spawn) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const r  = canvas.getBoundingClientRect();
        const ny = (e.clientY - r.top) / r.height;
        if (ny < 0.60) return; // only grab from bottom 40% of screen

        e.currentTarget.setPointerCapture(e.pointerId);
        swipeRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
        spinTrailRef.current = [{ x: e.clientX, y: e.clientY }];
        setSpinGlow(false);
        setBallVisible(false);
    }

    function handlePointerMove(e) {
        if (!swipeRef.current || throwing || shaking || catchResult) return;
        const trail = spinTrailRef.current;
        trail.push({ x: e.clientX, y: e.clientY });
        if (trail.length > 40) trail.shift();
        if (trail.length >= 8) setSpinGlow(detectSpin(trail) !== 0);
    }

    function handlePointerUp(e) {
        setSpinGlow(false);
        if (!swipeRef.current || throwing || shaking || catchResult) {
            setBallVisible(true); swipeRef.current = null; return;
        }

        const dx   = e.clientX - swipeRef.current.x;
        const dy   = e.clientY - swipeRef.current.y;
        const dtMs = Math.max(1, Date.now() - swipeRef.current.time);
        const spinDir = detectSpin(spinTrailRef.current);
        spinTrailRef.current = [];
        swipeRef.current = null;

        // Minimum upward swipe required
        if (dy >= -40) { setBallVisible(true); return; }

        if (attackRef.current) {
            setBallVisible(true);
            setBlocked(true);
            setTimeout(() => setBlocked(false), 900);
            return;
        }

        const canvas = canvasRef.current;
        const r = canvas.getBoundingClientRect();

        // ── Map 2D swipe → 3D throw velocity ──────────────────────────────────
        //
        // In true 3D:
        //   vZ = forward velocity (into screen, along world Z axis)
        //   vY = upward velocity (world Y axis) — must arc to reach Pokemon height
        //   vX = lateral velocity (world X axis) — from horizontal aim deviation
        //
        // Throw power from swipe speed — stronger swipe = faster throw
        const swipeSpeed = Math.abs(dy) / dtMs; // screen px/ms
        const power = Math.max(0.5, Math.min(1.5, swipeSpeed / 0.40));

        // vZ: how fast ball moves toward Pokemon in Z.
        // Baseline: reach pZ in THROW_TIME seconds. Power scales this.
        const vZ = pZ / (THROW_TIME / power);

        // Time of flight to reach Pokemon (T = pZ / vZ)
        const T = pZ / vZ;

        // vY: initial upward velocity to arc and reach Pokemon height at time T.
        // Using kinematic equation: y(T) = vy*T - 0.5*g*T² = pokemonHeight
        // => vy = (pokemonHeight + 0.5*g*T²) / T
        const pokemonCenterY = specH * 0.55;
        const launchY        = 0.5; // ball starts at Y=0.5 (hand height)
        const heightNeeded   = pokemonCenterY - launchY;
        const vY = (heightNeeded + 0.5 * GRAVITY * T * T) / T;

        // vX: lateral aim from horizontal swipe deviation from screen center.
        // Also add horizontal component from swipe direction itself.
        const aimDeviation = (e.clientX - (r.left + r.width * 0.5)) / (r.width * 0.5); // -1..1
        const vX = aimDeviation * vZ * 0.22 + (dx / dtMs) * 0.8;

        // Launch ball from world position (0, launchY, 0.4) — player's hand
        const phys = physRef.current;
        phys.pos.set(0, launchY, 0.4);
        phys.vel.set(vX, vY, vZ);
        phys.flying    = true;
        phys.ringScale = physRef.current.ringScale; // already updated by rAF
        phys.spinDir   = spinDir;

        if (threeRef.current) {
            threeRef.current.ball.position.set(0, launchY, 0.4);
            threeRef.current.ball.visible = true;
            threeRef.current.trailPositions.length = 0;
        }
    }

    function handlePointerCancel() {
        setBallVisible(true);
        spinTrailRef.current = [];
        setSpinGlow(false);
        swipeRef.current = null;
    }

    if (!spawn) return null;

    return (
        <div
            style={{ position: 'absolute', inset: 0, zIndex: 3000, touchAction: 'none', userSelect: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
        >
            {/* ── WebGL canvas — fills the full screen ──────────────────────── */}
            <canvas
                ref={canvasRef}
                style={{ width: '100%', height: '100%', display: 'block' }}
            />

            {/* ── HTML UI overlay ───────────────────────────────────────────── */}

            {/* Run button */}
            <button
                style={{ position:'absolute', top:20, left:20, zIndex:10, background:'rgba(0,0,0,0.42)', color:'white', border:'1px solid rgba(255,255,255,0.28)', borderRadius:20, padding:'8px 18px', fontSize:14, cursor:'pointer', backdropFilter:'blur(6px)' }}
                onPointerDown={e => e.stopPropagation()}
                onClick={onClose}
            >← Run</button>

            {/* Pokemon name pill */}
            <div style={{ position:'absolute', top:52, left:'50%', transform:'translateX(-50%)', zIndex:10, background:'rgba(0,0,0,0.50)', backdropFilter:'blur(8px)', borderRadius:28, padding:'8px 22px', color:'white', fontWeight:700, fontSize:18, whiteSpace:'nowrap', textAlign:'center', letterSpacing:0.4 }}>
                Wild {spawn.speciesName}!
                {distM > 0 && <div style={{ fontSize:11, color:'#94a3b8', fontWeight:400, marginTop:2 }}>{distM}m away</div>}
            </div>

            {/* Difficulty badge (top right) */}
            <div style={{ position:'absolute', top:52, right:16, zIndex:10, background:'rgba(0,0,0,0.40)', backdropFilter:'blur(6px)', borderRadius:12, padding:'7px 12px', color:'#cbd5e1', fontSize:11, textAlign:'center' }}>
                {diffLabel}
            </div>

            {/* Throw tier label */}
            {throwTier && !catchResult && (
                <div key={throwTier} style={{ position:'absolute', top:'16%', left:0, right:0, textAlign:'center', fontSize:34, fontWeight:900, letterSpacing:4, textTransform:'uppercase', pointerEvents:'none', zIndex:10, animation:'c3dTierPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both', textShadow:'0 2px 18px rgba(0,0,0,0.95)', color: throwTier==='Excellent'?'#fde047':throwTier==='Great'?'#93c5fd':'#86efac' }}>
                    {throwTier}!
                </div>
            )}

            {/* Deflected */}
            {blocked && (
                <div style={{ position:'absolute', top:'20%', left:0, right:0, textAlign:'center', color:'#fbbf24', fontSize:26, fontWeight:900, pointerEvents:'none', zIndex:10 }}>
                    Deflected!
                </div>
            )}

            {/* Dodge flash */}
            {dodgeFlash && (
                <div style={{ position:'absolute', top:'42%', left:0, right:0, textAlign:'center', color:'#fde047', fontSize:22, fontWeight:900, pointerEvents:'none', zIndex:10, textShadow:'0 2px 12px rgba(0,0,0,0.9)', animation:'c3dTierPop 0.4s ease both' }}>
                    Dodged!
                </div>
            )}

            {/* Catch result overlay */}
            {catchResult && catchResult.success && catchResult.pokemon && (
                <GotchaScreen pokemon={catchResult.pokemon} onClose={onClose} />
            )}
            {catchResult && !catchResult.success && (
                <div style={{ position:'absolute', top:0, left:0, right:0, bottom:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.55)', zIndex:20, animation:'c3dResultPop 0.4s ease' }}>
                    <div style={{ fontSize:72, marginBottom:8 }}>💨</div>
                    <div style={{ fontSize:26, fontWeight:800, color:'#f87171', textShadow:'0 2px 18px rgba(0,0,0,0.9)', marginBottom:24 }}>
                        {catchResult.message}
                    </div>
                    <button
                        style={{ background:'linear-gradient(135deg,#3b82f6,#2563eb)', color:'white', border:'none', borderRadius:16, padding:'15px 48px', fontSize:18, cursor:'pointer', fontWeight:700, boxShadow:'0 4px 24px rgba(59,130,246,0.5)' }}
                        onPointerDown={e => e.stopPropagation()}
                        onClick={onTryAgain}
                    >
                        🎯 Try Again!
                    </button>
                </div>
            )}

            {/* Hint */}
            {!throwing && !shaking && !catchResult && ballVisible && (
                <div style={{ position:'absolute', bottom:120, left:0, right:0, textAlign:'center', color:'rgba(255,255,255,0.80)', fontSize:14, zIndex:10, pointerEvents:'none' }}>
                    <div style={{ fontSize:26, color:'#22c55e', display:'block', animation:'c3dBounce 1.2s ease-in-out infinite' }}>↑</div>
                    {spinGlow ? '✨ Curveball! Release!' : attackAnim ? 'Watch out!' : 'Swipe up from the ball to throw!'}
                </div>
            )}

            {/* Spin glow indicator */}
            {spinGlow && (
                <div style={{ position:'absolute', bottom:150, left:'50%', transform:'translateX(-50%)', zIndex:10, background:'rgba(253,224,71,0.25)', border:'2px solid #fde047', borderRadius:20, padding:'5px 16px', color:'#fde047', fontSize:13, fontWeight:700, pointerEvents:'none' }}>
                    ✨ Curveball!
                </div>
            )}

            {/* Bottom row: Berry | [space] | Ball selector */}
            {!catchResult && !shaking && (
                <div style={{ position:'absolute', bottom:0, left:0, right:0, height:115, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 28px 12px', zIndex:10, pointerEvents:'none' }}
                     onPointerDown={e => e.stopPropagation()}>
                    {(() => {
                        const avail = BERRIES.filter(b => (items[b.type] || 0) > 0);
                        const active = BERRIES.find(b => b.type === displayBerry);
                        return (
                            <button
                                style={{ pointerEvents:'auto', width:68, height:68, borderRadius:'50%', background: active ? 'rgba(236,72,153,0.55)' : 'rgba(0,0,0,0.40)', border:`2px solid ${active ? '#ec4899' : 'rgba(255,255,255,0.25)'}`, backdropFilter:'blur(6px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2, cursor: avail.length > 0 ? 'pointer' : 'default', opacity: avail.length > 0 ? 1 : 0.4 }}
                                onClick={() => {
                                    if (!avail.length) return;
                                    const currIdx = avail.findIndex(b => b.type === displayBerry);
                                    const next = currIdx === -1 ? avail[0].type
                                        : (currIdx >= avail.length - 1 ? null : avail[currIdx + 1].type);
                                    selectedBerryRef.current = next;
                                    setDisplayBerry(next);
                                }}
                            >
                                <span style={{ fontSize: 26 }}>{active ? active.emoji : '🍓'}</span>
                                {active ? (
                                    <span style={{ color:'white', fontSize:9, fontWeight:700 }}>×{items[active.type] || 0}</span>
                                ) : avail.length > 0 ? (
                                    <span style={{ color:'rgba(255,255,255,0.5)', fontSize:9 }}>berry</span>
                                ) : null}
                            </button>
                        );
                    })()}
                    <div style={{ width:90 }} />
                    <button
                        style={{ pointerEvents:'auto', width:68, height:68, borderRadius:'50%', background:'rgba(0,0,0,0.40)', border:`2px solid ${selBallDef.color}88`, backdropFilter:'blur(6px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, cursor:'pointer' }}
                        onClick={() => {
                            if (throwing) return;
                            const avail = BALLS.filter(b => (items[b.type] || 0) > 0);
                            if (!avail.length) return;
                            const curr = avail.findIndex(b => b.type === selectedBall);
                            onSelectBall(avail[(curr + 1) % avail.length].type);
                        }}
                    >
                        <img src={`${pokemonApiUrl}/api/pokemon/item-sprites/${ballSprite}`} alt="" style={{ width:38, height:38, objectFit:'contain' }} onError={e => { e.target.style.display='none'; }} />
                        <span style={{ color:'white', fontSize:10, fontWeight:700 }}>×{items[selectedBall] || 0}</span>
                    </button>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Gotcha! — full-screen celebration overlay shown on successful catch
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_COLORS = {
    Fire:'#f97316',Water:'#3b82f6',Grass:'#22c55e',Electric:'#eab308',
    Psychic:'#ec4899',Ice:'#06b6d4',Dragon:'#7c3aed',Dark:'#374151',
    Normal:'#9ca3af',Fighting:'#b45309',Poison:'#a855f7',Ground:'#d97706',
    Flying:'#60a5fa',Bug:'#65a30d',Rock:'#78716c',Ghost:'#6366f1',
    Steel:'#64748b',Fairy:'#f472b6',
};

// Inject Gotcha keyframes once
if (!document.getElementById('gotcha-kf')) {
    const s = document.createElement('style');
    s.id = 'gotcha-kf';
    s.textContent = `
        @keyframes gotchaSlide  { 0%{transform:translateY(-60px);opacity:0} 55%{transform:translateY(10px);opacity:1} 100%{transform:translateY(0);opacity:1} }
        @keyframes gotchaStar   { 0%{opacity:0;transform:scale(0.2) rotate(-30deg)} 50%{opacity:1;transform:scale(1.25) rotate(5deg)} 100%{opacity:0;transform:scale(1.1) rotate(0deg) translateY(-30px)} }
        @keyframes gotchaSprite { 0%{transform:scale(0.3) translateY(40px);opacity:0} 60%{transform:scale(1.15) translateY(-8px);opacity:1} 100%{transform:scale(1) translateY(0);opacity:1} }
        @keyframes gotchaBtn    { 0%{transform:scale(0.7);opacity:0} 70%{transform:scale(1.08);opacity:1} 100%{transform:scale(1);opacity:1} }
        @keyframes gotchaXP     { 0%{transform:translateY(16px);opacity:0} 100%{transform:translateY(0);opacity:1} }
    `;
    document.head.appendChild(s);
}

function GotchaScreen({ pokemon, onClose }) {
    const xpEarned = Math.round(pokemon.pokemonLevel * 40 + 60);
    const stars = ['⭐','✨','🌟','⭐','✨'];

    return (
        <div style={{
            position: 'absolute', inset: 0, zIndex: 20,
            background: 'radial-gradient(ellipse at 50% 40%, #1e40af 0%, #0f172a 70%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
        }}>
            {/* Floating stars */}
            {stars.map((s, i) => (
                <div key={i} style={{
                    position:'absolute', fontSize: 28 + i * 6,
                    left: `${12 + i * 18}%`, top: `${8 + (i % 3) * 22}%`,
                    animation: `gotchaStar ${1.2 + i * 0.25}s ${i * 0.18}s ease-out both`,
                    pointerEvents: 'none',
                }}>{s}</div>
            ))}

            {/* "Gotcha!" text */}
            <div style={{
                fontSize: 56, fontWeight: 900, color: '#fde047',
                textShadow: '0 0 40px #f59e0b, 0 4px 20px rgba(0,0,0,0.9)',
                letterSpacing: 4, marginBottom: 18,
                animation: 'gotchaSlide 0.55s cubic-bezier(0.34,1.56,0.64,1) both',
            }}>Gotcha!</div>

            {/* Pokemon sprite */}
            <div style={{ animation: 'gotchaSprite 0.6s 0.15s cubic-bezier(0.34,1.56,0.64,1) both' }}>
                <div style={{ background: 'rgba(255,255,255,0.10)', borderRadius: '50%', width: 160, height: 160, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 60px rgba(253,224,71,0.35)' }}>
                    <img
                        src={`${pokemonApiUrl}/api/pokemon/sprites/${pokemon.spriteKey}`}
                        alt={pokemon.speciesName}
                        style={{ width: 130, height: 130, objectFit: 'contain', imageRendering: 'pixelated' }}
                        onError={e => { e.target.style.display = 'none'; }}
                    />
                </div>
            </div>

            {/* Name + level */}
            <div style={{ marginTop: 20, textAlign: 'center', animation: 'gotchaXP 0.4s 0.5s ease both' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'white', textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}>
                    {pokemon.speciesName} <span style={{ color:'#fde047' }}>Lv.{pokemon.pokemonLevel}</span>
                </div>
                {/* Type badges */}
                <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop:8 }}>
                    {pokemon.type1 && (
                        <span style={{ background:TYPE_COLORS[pokemon.type1]||'#9ca3af', color:'white', padding:'4px 14px', borderRadius:20, fontWeight:700, fontSize:13 }}>
                            {pokemon.type1}
                        </span>
                    )}
                    {pokemon.type2 && (
                        <span style={{ background:TYPE_COLORS[pokemon.type2]||'#9ca3af', color:'white', padding:'4px 14px', borderRadius:20, fontWeight:700, fontSize:13 }}>
                            {pokemon.type2}
                        </span>
                    )}
                </div>
                {/* XP earned */}
                <div style={{ marginTop:12, color:'#86efac', fontSize:15, fontWeight:600 }}>
                    +{xpEarned} Trainer XP
                </div>
            </div>

            {/* Button */}
            <button
                style={{
                    marginTop: 32,
                    background: 'linear-gradient(135deg,#fde047,#f59e0b)',
                    color: '#1c1917', border: 'none', borderRadius: 18,
                    padding: '16px 56px', fontSize: 19, cursor: 'pointer', fontWeight: 900,
                    boxShadow: '0 6px 28px rgba(245,158,11,0.55)',
                    animation: 'gotchaBtn 0.45s 0.7s cubic-bezier(0.34,1.56,0.64,1) both',
                }}
                onPointerDown={e => e.stopPropagation()}
                onClick={onClose}
            >
                🌟 Awesome!
            </button>
        </div>
    );
}
