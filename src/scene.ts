import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

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
        this.buildBaseUnit();
        this.buildMonitor();
        this.buildKeyboard();
        this.buildMouse();
        this.buildCables();

        // Position the whole group — slightly raised so nothing clips
        this.computerGroup.position.y = -0.3;
        this.computerGroup.rotation.y = 0;
    }

    private buildBaseUnit(): void {
        // Base Unit
        const baseGeo = new RoundedBoxGeometry(2.4, 0.5, 2.0, 4, 0.05);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0xd4cfc8, roughness: 0.65, metalness: 0.05 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.set(0, 0.25, 0);
        base.castShadow = true;
        base.receiveShadow = true;
        this.computerGroup.add(base);

        // Floppy drive bays (stacked on the right)
        const floppyGeo = new RoundedBoxGeometry(0.5, 0.06, 0.02, 2, 0.01);
        const floppyMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.3 });

        const floppy1 = new THREE.Mesh(floppyGeo, floppyMat);
        floppy1.position.set(0.7, 0.35, 1.01);
        this.computerGroup.add(floppy1);

        const floppy2 = new THREE.Mesh(floppyGeo, floppyMat);
        floppy2.position.set(0.7, 0.22, 1.01);
        this.computerGroup.add(floppy2);

        // Power button
        const btnGeo = new RoundedBoxGeometry(0.1, 0.1, 0.02, 2, 0.02);
        const btnMat = new THREE.MeshStandardMaterial({ color: 0xcc4444, roughness: 0.4 });
        const pwrBtn = new THREE.Mesh(btnGeo, btnMat);
        pwrBtn.position.set(-0.9, 0.25, 1.01);
        this.computerGroup.add(pwrBtn);

        // Badge
        const badgeGeo = new THREE.BoxGeometry(0.2, 0.05, 0.01);
        const badgeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const badge = new THREE.Mesh(badgeGeo, badgeMat);
        badge.position.set(-0.9, 0.38, 1.01);
        this.computerGroup.add(badge);
    }

    private buildMonitor(): void {
        // Monitor Body
        const monitorGeo = new RoundedBoxGeometry(1.8, 1.5, 1.2, 4, 0.08);
        const monitorMat = new THREE.MeshStandardMaterial({ color: 0xd4cfc8, roughness: 0.6, metalness: 0.05 });
        const monitor = new THREE.Mesh(monitorGeo, monitorMat);
        monitor.position.set(0, 1.6, 0.2);
        monitor.castShadow = true;
        monitor.receiveShadow = true;
        this.computerGroup.add(monitor);

        // Monitor tube / back
        const tubeGeo = new RoundedBoxGeometry(1.4, 1.1, 0.6, 4, 0.1);
        const tubeMat = new THREE.MeshStandardMaterial({ color: 0xc4bfb8, roughness: 0.7 });
        const tube = new THREE.Mesh(tubeGeo, tubeMat);
        tube.position.set(0, 1.6, -0.6);
        tube.castShadow = true;
        this.computerGroup.add(tube);

        // Bezel
        const bezelGeo = new RoundedBoxGeometry(1.82, 1.52, 0.05, 4, 0.02);
        const bezelMat = new THREE.MeshStandardMaterial({ color: 0xb8b2a8, roughness: 0.7 });
        const bezel = new THREE.Mesh(bezelGeo, bezelMat);
        bezel.position.set(0, 1.6, 0.8);
        this.computerGroup.add(bezel);

        // CRT Screen
        const screenGeo = new THREE.PlaneGeometry(1.5, 1.1);
        const screenMat = new THREE.MeshStandardMaterial({
            color: 0x111111, roughness: 0.2, metalness: 0.3,
            emissive: 0x00ffcc, emissiveIntensity: 0.15,
        });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0, 1.65, 0.83);
        this.screenMesh = screen;
        this.computerGroup.add(screen);

        const glowGeo = new THREE.PlaneGeometry(1.45, 1.05);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.06 });
        const glowOverlay = new THREE.Mesh(glowGeo, glowMat);
        glowOverlay.position.set(0, 1.65, 0.84);
        this.computerGroup.add(glowOverlay);

        // Power button on monitor
        const monBtnGeo = new RoundedBoxGeometry(0.06, 0.06, 0.02, 2, 0.01);
        const monBtnMat = new THREE.MeshStandardMaterial({ color: 0x44cc44 });
        const monBtn = new THREE.Mesh(monBtnGeo, monBtnMat);
        monBtn.position.set(0.7, 0.95, 0.83);
        this.computerGroup.add(monBtn);

        // Stand base
        const standBaseGeo = new RoundedBoxGeometry(0.8, 0.05, 0.8, 4, 0.02);
        const standBaseMat = new THREE.MeshStandardMaterial({ color: 0xd4cfc8, roughness: 0.6 });
        const standBase = new THREE.Mesh(standBaseGeo, standBaseMat);
        standBase.position.set(0, 0.52, 0.2);
        this.computerGroup.add(standBase);

        // Neck
        const neckGeo = new THREE.CylinderGeometry(0.15, 0.25, 0.35, 16);
        const neckMat = new THREE.MeshStandardMaterial({ color: 0xc5bfb5, roughness: 0.5 });
        const neck = new THREE.Mesh(neckGeo, neckMat);
        neck.position.set(0, 0.7, 0.2);
        neck.castShadow = true;
        this.computerGroup.add(neck);
    }

    private buildKeyboard(): void {
        // Base Unit width = 2.4. Keyboard width = 2.2 < 2.4
        const kbGeo = new RoundedBoxGeometry(2.2, 0.12, 0.8, 4, 0.04);
        const kbMat = new THREE.MeshStandardMaterial({ color: 0xc8c3b9, roughness: 0.9, metalness: 0.05 });
        const keyboard = new THREE.Mesh(kbGeo, kbMat);
        keyboard.position.set(0, 0.06, 1.7);
        keyboard.rotation.x = -0.08;
        keyboard.castShadow = true;
        this.computerGroup.add(keyboard);

        // Main alpha block
        this.buildKeyBlock(-0.95, 1.45, 5, 13, 0.11);
        // Nav block
        this.buildKeyBlock(0.35, 1.45, 5, 3, 0.11);
        // Numpad
        this.buildKeyBlock(0.85, 1.45, 5, 4, 0.11);

        // Add a wide spacebar manually
        const spaceGeo = new RoundedBoxGeometry(0.6, 0.06, 0.09, 2, 0.01);
        const spaceMat = new THREE.MeshStandardMaterial({ color: 0xe3decb, roughness: 0.8 });
        const space = new THREE.Mesh(spaceGeo, spaceMat);
        space.position.set(-0.45, 0.14, 1.97);
        space.rotation.x = -0.08;
        space.castShadow = true;
        this.computerGroup.add(space);
    }

    private buildKeyBlock(startX: number, startZ: number, rows: number, cols: number, keyWidth: number): void {
        const keySpacingX = keyWidth + 0.02;
        const keySpacingZ = 0.13;

        const keyGeo = new RoundedBoxGeometry(keyWidth, 0.06, 0.09, 2, 0.01);
        const alphaMat = new THREE.MeshStandardMaterial({ color: 0xe3decb, roughness: 0.8 });
        const modMat = new THREE.MeshStandardMaterial({ color: 0xa8a49c, roughness: 0.8 });

        for (let r = 0; r < rows; r++) {
            // skip spacebar placeholder row for alpha block if we wanted, let's just leave it empty by reducing count or continuing
            if (cols > 5 && r === 4) continue;

            for (let c = 0; c < cols; c++) {
                const isMod = c === 0 || c === cols - 1 || r === 0;
                const mat = isMod ? modMat : alphaMat;
                const key = new THREE.Mesh(keyGeo, mat);
                key.position.set(startX + c * keySpacingX, 0.14, startZ + r * keySpacingZ);
                key.rotation.x = -0.08;
                key.castShadow = true;
                this.computerGroup.add(key);
            }
        }
    }

    private buildMouse(): void {
        const mouseGeo = new RoundedBoxGeometry(0.35, 0.15, 0.5, 4, 0.08);
        const mouseMat = new THREE.MeshStandardMaterial({ color: 0xd4cfc8, roughness: 0.7 });
        const mouse = new THREE.Mesh(mouseGeo, mouseMat);
        mouse.position.set(1.4, 0.075, 1.7);
        mouse.rotation.y = -0.1;
        mouse.castShadow = true;
        this.computerGroup.add(mouse);

        // Mouse buttons
        const btnGeo = new RoundedBoxGeometry(0.14, 0.04, 0.2, 2, 0.02);
        const btnMat = new THREE.MeshStandardMaterial({ color: 0xc8c3b9, roughness: 0.8 });

        const leftBtn = new THREE.Mesh(btnGeo, btnMat);
        leftBtn.position.set(1.31, 0.15, 1.55);
        leftBtn.rotation.y = -0.1;
        this.computerGroup.add(leftBtn);

        const rightBtn = new THREE.Mesh(btnGeo, btnMat);
        rightBtn.position.set(1.49, 0.15, 1.55);
        rightBtn.rotation.y = -0.1;
        this.computerGroup.add(rightBtn);
    }

    private buildCables(): void {
        const mat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });

        // Mouse cable
        const mouseCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(1.35, 0.05, 1.45),
            new THREE.Vector3(1.2, 0.02, 1.1),
            new THREE.Vector3(0.5, 0.02, 0.9),
            new THREE.Vector3(0.0, 0.1, 0.9) // Entering base unit
        ]);
        const mouseCableGeo = new THREE.TubeGeometry(mouseCurve, 20, 0.015, 8, false);
        const mouseCable = new THREE.Mesh(mouseCableGeo, mat);
        this.computerGroup.add(mouseCable);

        // Keyboard cable
        const kbCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0.06, 1.3),
            new THREE.Vector3(-0.2, 0.02, 1.1),
            new THREE.Vector3(0, 0.1, 0.9)
        ]);
        const kbCableGeo = new THREE.TubeGeometry(kbCurve, 10, 0.02, 8, false);
        const kbCable = new THREE.Mesh(kbCableGeo, mat);
        this.computerGroup.add(kbCable);
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
