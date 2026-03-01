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

    // Camera keyframes: zoomed-in (screen close-up) → zoomed-out (full computer)
    // Start: tight on the monitor screen, slightly above center
    private readonly CAM_START = new THREE.Vector3(0, 1.4, 3.5);
    // End: pulled back and elevated to frame the entire computer + keyboard
    private readonly CAM_END = new THREE.Vector3(0, 2.8, 6.5);

    // Look-at targets: start centered on screen → end centered on whole model
    private readonly LOOK_START = new THREE.Vector3(0, 1.1, 0);
    private readonly LOOK_END = new THREE.Vector3(0, 0.6, 0);

    // FOV animation: tight → slightly wider to reveal more of the scene
    private readonly FOV_START = 35;
    private readonly FOV_END = 45;

    constructor(containerId: string) {
        const el = document.getElementById(containerId);
        if (!el) throw new Error(`Container #${containerId} not found`);
        this.container = el;

        // Scene setup
        this.scene = new THREE.Scene();

        // Camera — starts tight, FOV widens on scroll
        this.camera = new THREE.PerspectiveCamera(
            this.FOV_START,
            window.innerWidth / window.innerHeight,
            0.1,
            100
        );
        this.camera.position.copy(this.CAM_START);

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
        const screenTexture = this.createScreenTexture();
        const screenMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            map: screenTexture,
            roughness: 0.2,
            metalness: 0.3,
            emissive: 0x00ffcc,
            emissiveIntensity: 0.15,
            emissiveMap: screenTexture,
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
        const kbGeo = new THREE.BoxGeometry(2.0, 0.08, 0.7);
        const kbMat = new THREE.MeshStandardMaterial({
            color: 0x2c2c2c,
            roughness: 0.8,
            metalness: 0.1,
        });
        const keyboard = new THREE.Mesh(kbGeo, kbMat);
        keyboard.position.set(0, 0.04, 1.6);
        keyboard.rotation.x = -0.1;
        keyboard.castShadow = true;
        this.computerGroup.add(keyboard);

        // Key rows
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 12; col++) {
                const keyGeo = new THREE.BoxGeometry(0.12, 0.04, 0.1);
                const keyMat = new THREE.MeshStandardMaterial({
                    color: 0x1a1a1a,
                    roughness: 0.6,
                });
                const key = new THREE.Mesh(keyGeo, keyMat);
                key.position.set(
                    -0.85 + col * 0.155,
                    0.1 + 0.02,
                    1.38 + row * 0.14
                );
                key.rotation.x = -0.1;
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

    /** Create a canvas texture with terminal-like content for the 3D screen */
    private createScreenTexture(): THREE.CanvasTexture {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 352;
        const ctx = canvas.getContext('2d')!;

        // Dark CRT background
        ctx.fillStyle = '#0a1520';
        ctx.fillRect(0, 0, 512, 352);

        // Subtle scanlines
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        for (let y = 0; y < 352; y += 3) {
            ctx.fillRect(0, y, 512, 1);
        }

        // Terminal text
        const green = '#00ffcc';
        const dim = 'rgba(0,255,204,0.5)';

        ctx.fillStyle = green;
        ctx.font = '16px monospace';
        ctx.fillText('Hi there.', 30, 45);

        // Name with highlight block
        ctx.fillStyle = green;
        ctx.fillRect(28, 55, 185, 30);
        ctx.fillStyle = '#0a1520';
        ctx.font = 'bold 20px monospace';
        ctx.fillText("I'm [Name]", 35, 77);

        // Roles
        ctx.fillStyle = green;
        ctx.font = '13px monospace';
        ctx.fillText('• Computer Engineer', 30, 110);
        ctx.fillText('• Graduate Student', 30, 128);

        // Welcome message
        ctx.fillStyle = dim;
        ctx.font = '11px monospace';
        ctx.fillText('CE-Linux 1.0 LTS (CE-Kernel 6.8.0-ce)', 30, 220);
        ctx.fillText('* Documentation:  type "help"', 36, 244);
        ctx.fillText('* Projects:       cd projects/ && ls', 36, 260);

        // Prompt
        ctx.fillStyle = green;
        ctx.font = '12px monospace';
        ctx.fillText('user@ce-linux:~$', 30, 320);
        ctx.fillText('█', 185, 320);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        return texture;
    }

    /** Interpolate background color from dark to slate blue */
    getBackgroundColor(): THREE.Color {
        const darkColor = new THREE.Color(0x0a0f14);
        const slateColor = new THREE.Color(0x1a2332);
        return darkColor.clone().lerp(slateColor, this.scrollProgress);
    }

    private animate = (): void => {
        this.animationId = requestAnimationFrame(this.animate);

        // Interpolate camera position based on scroll
        const t = this.scrollProgress;
        const easedT = this.easeInOutCubic(t);

        this.camera.position.lerpVectors(this.CAM_START, this.CAM_END, easedT);

        // Animate FOV: tight at start, wider at end
        this.camera.fov = this.FOV_START + (this.FOV_END - this.FOV_START) * easedT;
        this.camera.updateProjectionMatrix();

        const lookAt = new THREE.Vector3().lerpVectors(
            this.LOOK_START,
            this.LOOK_END,
            easedT
        );
        this.camera.lookAt(lookAt);

        // Subtle computer rotation on scroll
        this.computerGroup.rotation.y = easedT * 0.15;

        // Slow continuous gentle wobble
        const time = performance.now() * 0.0005;
        this.computerGroup.rotation.y += Math.sin(time) * 0.02;

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
