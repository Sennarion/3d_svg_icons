/* eslint-disable import/extensions */
/* eslint-disable no-unreachable */
import * as T from 'three';
import dat from 'dat.gui';
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';s
// import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls, SVGLoader } from 'three/examples/jsm/Addons.js';

// for the glsl syntax highlighting
const glsl = (strings, ...values) => {
	return strings.reduce((acc, str, i) => {
		return acc + str + (values[i] !== undefined ? values[i] : '');
	}, '');
}; // for the glsl syntax highlighting#

export default class Sketch {
	constructor(options) {
		this.container = options.dom;
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.time = 0;
		this.isPlaying = true;

		this.initScene();
		this.initCamera();
		this.initRenderer();
		this.initControls();

		this.setup();
	}

	async setup() {
		await this.loadShaders();
		this.addObjects();
		this.resize();
		this.render();
		this.setupResize();
	}

	initScene() {
		this.scene = new T.Scene();

		const ambientLight = new T.AmbientLight(0xffffff, 1);
		this.scene.add(ambientLight);

		const directionalLight = new T.DirectionalLight(0xffffff, 1);
		directionalLight.position.set(0, 0, 10);
		this.scene.add(directionalLight);
		directionalLight.castShadow = true;

		directionalLight.shadow.camera.left = -10;
		directionalLight.shadow.camera.right = 10;
		directionalLight.shadow.camera.top = 10;
		directionalLight.shadow.camera.bottom = -10;
	}

	initCamera() {
		this.camera = new T.PerspectiveCamera(70, this.width / this.height, 0.001, 1000);
		this.camera.position.set(0, 0, 20);
	}

	initRenderer() {
		this.renderer = new T.WebGLRenderer({
			alpha: true,
			antialias: true,
			precision: 'highp',
		});
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(this.width, this.height);
		this.renderer.setClearColor(0x010101, 0);
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = T.PCFSoftShadowMap;
		this.renderer.toneMapping = T.ACESFilmicToneMapping;
		this.renderer.outputEncoding = T.sRGBEncoding;

		this.container.appendChild(this.renderer.domElement);
	}

	initControls() {
		this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
	}

	async loadResources(resources) {
		const fileLoader = new T.FileLoader();

		const loaders = {
			shader: fileLoader,
		};

		const resourcesEntries = resources.map(({ type, url, key }) => {
			const promise = new Promise((resolve, reject) => {
				loaders[type].load(url, resolve, () => {}, reject);
			});
			return [key, promise];
		});

		return Object.fromEntries(resourcesEntries);
	}

	async loadShaders() {
		const resources = await this.loadResources([
			{
				key: 'fragment',
				type: 'shader',
				url: './static/shader/fragment.glsl',
			},
			{
				key: 'vertex',
				type: 'shader',
				url: './static/shader/vertex.glsl',
			},
		]);

		if (!resources) return;

		this.vertex = await resources.vertex;
		this.fragment = await resources.fragment;
	}

	addObjects() {
		const loader = new SVGLoader();

		const planeGeometry = new T.PlaneGeometry(30, 30, 30);
		const planeMaterial = new T.MeshStandardMaterial({
			color: '#ffffff',
		});

		const plane = new T.Mesh(planeGeometry, planeMaterial);
		this.scene.add(plane);
		plane.position.z = -2;
		plane.receiveShadow = true;

		const addIcon = ({ iconSrc, scale, position, depth }) => {
			loader.load(iconSrc, (data) => {
				const paths = data.paths;
				const group = new T.Group();

				paths.forEach((path) => {
					const material = new T.MeshStandardMaterial({
						color: '#de7e00',
						side: T.DoubleSide,
						depthWrite: true,
					});

					const shapes = SVGLoader.createShapes(path);

					shapes.forEach((shape) => {
						const geometry = new T.ExtrudeGeometry(shape, {
							depth,
							bevelEnabled: false,
						});
						geometry.computeVertexNormals();
						geometry.center();

						const mesh = new T.Mesh(geometry, material);
						mesh.castShadow = true;
						group.add(mesh);
					});
				});

				this.scene.add(group);
				group.scale.set(scale, scale, scale);
				group.position.set(...position);
				group.rotateZ(Math.PI);
				group.castShadow = true;
				group.rotation.x = Math.PI * 0.05;
				group.rotation.y = Math.PI * 0.05;
			});
		};

		addIcon({
			iconSrc: './static/fragile.svg',
			scale: 0.01,
			position: [-5, -5, 0],
			depth: 30,
		});

		addIcon({
			iconSrc: './static/umbrella.svg',
			scale: 0.08,
			position: [5, -5, 0],
			depth: 4,
		});

		addIcon({
			iconSrc: './static/fire.svg',
			scale: 0.2,
			position: [-5, 5, 0],
			depth: 1.5,
		});

		addIcon({
			iconSrc: './static/snowfake.svg',
			scale: 0.02,
			position: [5, 5, 0],
			depth: 15,
		});
	}

	setupResize() {
		window.addEventListener('resize', this.resize.bind(this));
	}

	resize() {
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer.setSize(this.width, this.height);
		this.camera.aspect = this.width / this.height;
		this.camera.updateProjectionMatrix();
	}

	stop() {
		this.isPlaying = false;
	}

	play() {
		if (!this.isPlaying) {
			this.render();
			this.isPlaying = true;
		}
	}

	render() {
		if (!this.isPlaying) return;
		this.time += 0.05;
		// this.material.uniforms.time.value = this.time;
		window.requestAnimationFrame(this.render.bind(this));
		this.renderer.render(this.scene, this.camera);
	}

	uiConfigurator() {
		this.gui = new dat.GUI();
		this.gui.domElement.style.position = 'absolute';
		this.gui.domElement.style.top = '0';
		this.gui.domElement.style.left = '0';
		this.animationSettings = {
			speed: 0.6,
		};
		this.gui.add(this.animationSettings, 'speed', 0.1, 1).onChange(() => {
			// this.timeline.timeScale(this.animationSettings.speed);
		});
	}

	addTransformControls() {
		this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
		this.scene.add(this.transformControls);

		// example
		const directionalLight = this.scene.getObjectByName('directionalLight');
		if (directionalLight) {
			this.transformControls.attach(directionalLight);
		}

		this.transformControls.addEventListener('dragging-changed', (event) => {
			this.orbitControls.enabled = !event.value;
		});

		const inputTypes = {
			r: 'rotate',
			t: 'translate',
			s: 'translate',
		};

		window.addEventListener('keydown', (event) => {
			if (inputTypes[event.key]) this.transformControls.setMode(inputTypes[event.key]);
		});

		this.transformControls.addEventListener('change', () => {
			this.renderer.render(this.scene, this.camera);
		});
	}
}
