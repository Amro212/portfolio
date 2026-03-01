import * as THREE from 'three';

/**
 * Creates and manages the retro 3D computer scene.
 * The computer is built entirely from Three.js box geometries
 * (monitor, base unit, keyboard) with scroll-synced camera animation.
 */

export class RetroComputerScene {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private container: HTMLElement;
    private computerGroup: THREE.Group;
    private screenMesh!: THREE.Mesh;
    private animationId: number | null = null;

    // Scroll animation state
    private scrollProgress = 0;
    private portraitOffset = 0;

    // ── Camera system (edh.dev technique) ─────────────────────────
    // Wide FOV + close camera Z = screen fills viewport
    // Scroll moves camera Z back AND transforms the computer group
    // Math: screen at z=0.73, height=1.1, FOV=75
    //   distance = (0.55) / tan(37.5°) ≈ 0.72 → camera z ≈ 1.45
    private readonly CAMERA_FOV = 75;
    private readonly CAM_Z_START = 1.50;   // Exact distance for screen to fill viewport
    private readonly CAM_Z_END = 5.0;      // Pulled back (full computer visible, not too small)

    // Model position at scroll progress
    private readonly MODEL_Y_START = 0;     // At origin
    private readonly MODEL_Y_END = 0;    // Moves DOWN to reveal keyboard
    private readonly MODEL_ROT_START = 0;   // No rotation
    private readonly MODEL_ROT_END = 0.6;   // ~22 degrees rotation

    // Camera Y offset — screen center
    private readonly CAM_Y = 1.35;          // Center of screen mesh (1.65 - 0.3 group offset)

    constructor(containerId: string) {
        const el = document.getElementById(containerId);
        if (!el) throw new Error(`Container #${containerId} not found`);
        this.container = el;

        // Scene setup
        this.scene = new THREE.Scene();

        // Calculate portrait offset (aspect ratio compensation)
        // Ensures screen fills viewport on both wide and narrow screens
        this.updatePortraitOffset();

        // Camera — wide FOV, close Z (edh.dev technique)
        this.camera = new THREE.PerspectiveCamera(
            this.CAMERA_FOV,
            window.innerWidth / window.innerHeight,
            0.1,
            100
        );
        this.camera.position.set(0, this.CAM_Y, this.CAM_Z_START + this.portraitOffset);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.container.appendChild(this.renderer.domElement);

        // Build
        this.computerGroup = new THREE.Group();
        this.buildComputer();
        this.scene.add(this.computerGroup);

        this.addLights();
        this.addFloor();

        // Events
        window.addEventListener('resize', this.onResize);

        // Start rendering
        this.animate();
    }

    private buildComputer(): void {
        // ---- Monitor Body ----
        const monitorGeo = new THREE.BoxGeometry(2.0, 1.6, 1.4);
        // Give edges a slight roundness
        const monitorMat = new THREE.MeshStandardMaterial({
            color: 0xd4cfc8,
            roughness: 0.6,
            metalness: 0.05,
        });
        const monitor = new THREE.Mesh(monitorGeo, monitorMat);
        monitor.position.set(0, 1.6, 0);
        monitor.castShadow = true;
        monitor.receiveShadow = true;
        this.computerGroup.add(monitor);

        // Monitor bezel (inset slightly darker)
        const bezelGeo = new THREE.BoxGeometry(2.05, 1.65, 0.05);
        const bezelMat = new THREE.MeshStandardMaterial({
            color: 0xb8b2a8,
            roughness: 0.7,
            metalness: 0.02,
        });
        const bezel = new THREE.Mesh(bezelGeo, bezelMat);
        bezel.position.set(0, 1.6, 0.7);
        this.computerGroup.add(bezel);

        // ---- CRT Screen ----
        const screenGeo = new THREE.PlaneGeometry(1.6, 1.1);
        const screenMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.2,
            metalness: 0.3,
            emissive: 0x00ffcc,
            emissiveIntensity: 0.15,
        });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0, 1.65, 0.73);
        this.screenMesh = screen;
        this.computerGroup.add(screen);

        // Screen text glow overlay
        const glowGeo = new THREE.PlaneGeometry(1.55, 1.05);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0x00ffcc,
            transparent: true,
            opacity: 0.06,
        });
        const glowOverlay = new THREE.Mesh(glowGeo, glowMat);
        glowOverlay.position.set(0, 1.65, 0.74);
        this.computerGroup.add(glowOverlay);

        // ---- Monitor Neck ----
        const neckGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.3, 16);
        const neckMat = new THREE.MeshStandardMaterial({
            color: 0xc5bfb5,
            roughness: 0.5,
            metalness: 0.1,
        });
        const neck = new THREE.Mesh(neckGeo, neckMat);
        neck.position.set(0, 0.7, 0);
        neck.castShadow = true;
        this.computerGroup.add(neck);

        // ---- Base Unit ----
        const baseGeo = new THREE.BoxGeometry(2.4, 0.5, 1.8);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0xd4cfc8,
            roughness: 0.65,
            metalness: 0.05,
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.set(0, 0.25, 0);
        base.castShadow = true;
        base.receiveShadow = true;
        this.computerGroup.add(base);

        // Floppy drive slot
        const floppyGeo = new THREE.BoxGeometry(0.6, 0.06, 0.02);
        const floppyMat = new THREE.MeshStandardMaterial({
            color: 0x3a3a3a,
            roughness: 0.3,
        });
        const floppy = new THREE.Mesh(floppyGeo, floppyMat);
        floppy.position.set(0.4, 0.35, 0.91);
        this.computerGroup.add(floppy);

        // Second floppy
        const floppy2 = new THREE.Mesh(floppyGeo, floppyMat);
        floppy2.position.set(-0.4, 0.35, 0.91);
        this.computerGroup.add(floppy2);

        // ---- Keyboard ----
        // Base of the keyboard
        const kbGeo = new THREE.BoxGeometry(2.1, 0.1, 0.8);
        const kbMat = new THREE.MeshStandardMaterial({
            color: 0xc8c3b9, // Match a beige/retro plastic
            roughness: 0.9,
            metalness: 0.05,
        });
        const keyboard = new THREE.Mesh(kbGeo, kbMat);
        keyboard.position.set(0, 0.05, 1.7);
        keyboard.rotation.x = -0.12; // Slight ergonomic tilt
        keyboard.castShadow = true;
        this.computerGroup.add(keyboard);

        // Key rows - make them look more like mechanical keys
        const startX = -0.9;
        const startZ = 1.45;
        const keySpacingX = 0.145;
        const keySpacingZ = 0.13;

        for (let row = 0; row < 5; row++) {
            // Top row usually has funkier spacing (function keys), but we'll do standard blocks
            let cols = 13;
            if (row === 4) cols = 7; // Bottom row (spacebar row) has fewer keys

            for (let col = 0; col < cols; col++) {
                let kw = 0.11;
                let kx = startX + col * keySpacingX;
                let kz = startZ + row * keySpacingZ;

                // Alternate key colors for realism (modifier keys vs alpha keys)
                let isModifier = col === 0 || col === cols - 1;

                // Make a spacebar on the bottom row
                if (row === 4) {
                    if (col === 3) {
                        kw = 0.6; // Spacebar
                        kx = startX + 3.5 * keySpacingX;
                        isModifier = false;
                    } else if (col > 3) {
                        kx = startX + (col + 3) * keySpacingX;
                        isModifier = true;
                    } else {
                        isModifier = true;
                    }
                }

                // Return key logic
                if (row === 2 && col === cols - 1) {
                    kw = 0.18;
                    kx -= 0.03;
                }

                const keyGeo = new THREE.BoxGeometry(kw, 0.06, 0.09);
                const keyColor = isModifier ? 0xa8a49c : 0xe3decb;

                const keyMat = new THREE.MeshStandardMaterial({
                    color: keyColor,
                    roughness: 0.8,
                });
                const key = new THREE.Mesh(keyGeo, keyMat);

                // Position relative to keyboard body rotation
                key.position.set(kx, 0.13, kz);
                key.rotation.x = -0.12;
                key.castShadow = true;
                this.computerGroup.add(key);
            }
        }

        // Position the whole group — slightly raised so nothing clips
        this.computerGroup.position.y = -0.3;
        this.computerGroup.rotation.y = 0;
    }

    private addLights(): void {
        // Ambient
        const ambient = new THREE.AmbientLight(0xfff0e8, 0.4);
        this.scene.add(ambient);

        // Main directional (warm)
        const dirLight = new THREE.DirectionalLight(0xfff5ee, 1.0);
        dirLight.position.set(3, 5, 4);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 20;
        dirLight.shadow.camera.left = -5;
        dirLight.shadow.camera.right = 5;
        dirLight.shadow.camera.top = 5;
        dirLight.shadow.camera.bottom = -5;
        this.scene.add(dirLight);

        // Fill light (cool, from left)
        const fillLight = new THREE.DirectionalLight(0xb0d4f1, 0.3);
        fillLight.position.set(-3, 3, 2);
        this.scene.add(fillLight);

        // Rim light from behind the screen
        const rimLight = new THREE.PointLight(0x00ffcc, 0.5, 10);
        rimLight.position.set(0, 2, -1);
        this.scene.add(rimLight);
    }

    private addFloor(): void {
        const floorGeo = new THREE.PlaneGeometry(20, 20);
        const floorMat = new THREE.ShadowMaterial({
            opacity: 0.15,
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.5;
        floor.receiveShadow = true;
        this.scene.add(floor);
    }

    /** Update scroll progress (0 = zoomed in, 1 = zoomed out) */
    setScrollProgress(progress: number): void {
        this.scrollProgress = Math.max(0, Math.min(1, progress));
    }

    /** Project screen mesh corners to 2D viewport coords */
    getScreenRect(): { left: number; top: number; width: number; height: number } {
        this.computerGroup.updateWorldMatrix(true, true);

        const hw = 0.8, hh = 0.55; // half-extents of PlaneGeometry(1.6, 1.1)
        const corners = [
            new THREE.Vector3(-hw, hh, 0),
            new THREE.Vector3(hw, hh, 0),
            new THREE.Vector3(-hw, -hh, 0),
            new THREE.Vector3(hw, -hh, 0),
        ];

        const w = this.renderer.domElement.clientWidth;
        const h = this.renderer.domElement.clientHeight;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        for (const c of corners) {
            c.applyMatrix4(this.screenMesh.matrixWorld);
            c.project(this.camera);
            const px = (c.x * 0.5 + 0.5) * w;
            const py = (-c.y * 0.5 + 0.5) * h;
            minX = Math.min(minX, px);
            minY = Math.min(minY, py);
            maxX = Math.max(maxX, px);
            maxY = Math.max(maxY, py);
        }

        return { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
    }

    /** Update screen texture from an external canvas */
    setScreenCanvas(canvas: HTMLCanvasElement): void {
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.format = THREE.RGBAFormat;
        (this.screenMesh.material as THREE.MeshStandardMaterial).map = texture;
        (this.screenMesh.material as THREE.MeshStandardMaterial).emissiveMap = texture;
        (this.screenMesh.material as THREE.MeshStandardMaterial).needsUpdate = true;
    }

    /** Called on render loop by external terminal to flag texture update */
    updateTexture(): void {
        const mat = this.screenMesh.material as THREE.MeshStandardMaterial;
        if (mat.map) {
            mat.map.needsUpdate = true;
        }
    }

    /** Interpolate background color from dark to slate blue */
    getBackgroundColor(): THREE.Color {
        const darkColor = new THREE.Color(0x0a0f14);
        const slateColor = new THREE.Color(0x1a2332);
        return darkColor.clone().lerp(slateColor, this.scrollProgress);
    }

    /** Aspect-ratio-aware portrait offset (edh.dev technique)
     *  Maps the height/width ratio to a camera Z offset so the screen
     *  fills the viewport on both landscape monitors and portrait phones.
     */
    private updatePortraitOffset(): void {
        const ratio = window.innerHeight / window.innerWidth;
        // Linear interpolation: ratio 0.5 → offset 0, ratio 1.5 → offset 2.0
        this.portraitOffset = Math.max(0, Math.min(2.5, (ratio - 0.5) * 2.0));
    }

    /** Utility: linear interpolation */
    private lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    private animate = (): void => {
        this.animationId = requestAnimationFrame(this.animate);

        const t = this.scrollProgress;
        const easedT = this.easeInOutCubic(t);

        // ── Camera Z-axis zoom (NOT FOV animation) ──
        // Start close (screen fills viewport) → pull back (reveal full computer)
        const camZ = this.lerp(
            this.CAM_Z_START + this.portraitOffset,
            this.CAM_Z_END + this.portraitOffset,
            easedT
        );
        this.camera.position.set(0, this.CAM_Y, camZ);

        // ── Object transforms on scroll ──
        // Move computer group DOWN so we look "down" at it
        const modelY = this.lerp(this.MODEL_Y_START, this.MODEL_Y_END, easedT);
        this.computerGroup.position.y = -0.3 + modelY;

        // Rotate computer on scroll for dimensional reveal
        const modelRot = this.lerp(this.MODEL_ROT_START, this.MODEL_ROT_END, easedT);
        this.computerGroup.rotation.y = modelRot;

        // Subtle continuous wobble
        const time = performance.now() * 0.0005;
        this.computerGroup.rotation.y += Math.sin(time) * 0.015;

        // Camera always looks at the center of the computer group
        this.camera.lookAt(new THREE.Vector3(0, this.computerGroup.position.y + 1.6, 0));

        // Update background
        const bgColor = this.getBackgroundColor();
        this.renderer.setClearColor(bgColor, 1);

        this.renderer.render(this.scene, this.camera);
    };

    private easeInOutCubic(t: number): number {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    private onResize = (): void => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.updatePortraitOffset();
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    };

    destroy(): void {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        window.removeEventListener('resize', this.onResize);
        this.renderer.dispose();
        this.container.removeChild(this.renderer.domElement);
    }
}
