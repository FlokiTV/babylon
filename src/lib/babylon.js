// @ts-nocheck
import '@babylonjs/core/Debug/debugLayer';
import '@babylonjs/inspector';
import {
	Engine,
	Scene,
	ArcRotateCamera,
	Vector3,
	HemisphericLight,
	Matrix,
	Mesh,
	MeshBuilder,
	ShadowGenerator,
	DirectionalLight,
	StandardMaterial,
	NodeMaterial,
	PBRMaterial,
	Color3,
	Color4,
	SceneLoader,
	AssetsManager,
	FilesInput
} from '@babylonjs/core';

export class App {
	#assetsManager;
	#scene;
	#lights;
	#camera;
	#sphere; //picker
	currentModel;
	points;
	onhitcallback;
	/**
	 *
	 * @param {HTMLCanvasElement|null} canvas
	 */
	constructor(canvas) {
		if (!canvas) throw Error('Canvas not found');
		this.points = [];
		// initialize babylon scene and engine
		let engine = new Engine(canvas, true);
		let scene = new Scene(engine);
		this.#scene = scene;
		// common scene parameters
		const sceneParams = {
			clearColor: new Color4(0, 0, 0, 0),
			bgColor: Color3.FromInts(111, 127, 133),
			gutterSize: 20
		};
		this.#assetsManager = new AssetsManager(scene);
		let camera = new ArcRotateCamera('Camera', Math.PI / 2, Math.PI / 2, 2, Vector3.Zero(), scene);
		this.#camera = camera;
		camera.attachControl(canvas, true);
		camera.minZ = 0.1;
		camera.wheelDeltaPercentage = 0.1;
		// camera.upperRadiusLimit = 20;
		// camera.lowerRadiusLimit = 1;
		// camera.upperBetaLimit = 1.4;
		// camera.lowerBetaLimit = 0;

		// create skybox with unlit color to blend into ground mesh and set to visible in both cameras
		const skybox = MeshBuilder.CreateBox('skyBox', { size: 1000.0 }, scene);
		const skyboxMaterial = new PBRMaterial('skyBox', scene);
		skyboxMaterial.backFaceCulling = false;
		skyboxMaterial.albedoColor = sceneParams.bgColor.toLinearSpace();
		skyboxMaterial.unlit = true;
		skybox.material = skyboxMaterial;
		skybox.isPickable = false;

		this.#lights = {};
		this.#lights.dirLightLeft = new DirectionalLight(
			'dirLightLeft',
			new Vector3(10, -20, -10),
			scene
		);
		this.#lights.dirLightLeft.intensity = 0.7;
		let light = new HemisphericLight('light1', new Vector3(1, 1, 0), scene);
		const meshes = {};
		meshes.sphere = MeshBuilder.CreateSphere('sphere', { diameter: 0.1 }, scene);
		this.#sphere = meshes.sphere;
		let spheremat = new StandardMaterial('mat', this.#scene);
		spheremat.alpha = 0.5;
		spheremat.emissiveColor = Color3.Yellow();
		this.#sphere.material = spheremat;

		meshes.box = MeshBuilder.CreateBox('box', { size: 1 }, scene);
		meshes.box.position.y = 1;
		meshes.groundLeft = MeshBuilder.CreateGround('groundLeft', { width: 150, height: 150 }, scene);
		meshes.groundLeft.position.y = -0.2;
		meshes.groundLeft.receiveShadows = true;
		const groundMaterial = new StandardMaterial('ground', scene);
		groundMaterial.specularColor = Color3.Black();
		groundMaterial.diffuseColor = new Color3(0.4, 0.4, 0.4);
		groundMaterial.specularColor = new Color3(0.4, 0.4, 0.4);
		groundMaterial.emissiveColor = Color3.Black();
		groundMaterial.reflectionTexture = null;
		meshes.groundLeft.material = groundMaterial;

		meshes.sphere.isPickable = false;
		meshes.groundLeft.isPickable = false;
		// set lights
		// light.includedOnlyMeshes.push(meshes.groundLeft);
		// light.includedOnlyMeshes.push(meshes.sphere);
		// light.includedOnlyMeshes.push(meshes.box);
		this.#lights.dirLightLeft.includedOnlyMeshes.push(meshes.groundLeft);
		this.#lights.dirLightLeft.includedOnlyMeshes.push(meshes.box);

		const shadow = new ShadowGenerator(1024, this.#lights.dirLightLeft);
		shadow.useContactHardeningShadow = true;
		// shadow.contactHardeningLightSizeUVRatio = 0.07;
		// shadow.darkness = 0.65;
		shadow.enableSoftTransparentShadow = true;
		shadow.transparencyShadow = true;
		shadow.addShadowCaster(meshes.box);

		// set the raycast
		this.currentMesh = 'box';

		scene.onPointerMove = () => {
			this.#sphere.material.alpha = 0.8;
			for (const point of this.points) {
				point.material.alpha = 0.7;
				point.material.emissiveColor = Color3.Blue();
			}
			let hit = this.raycast();
			if (hit) {
				const { pickedMesh, pickedPoint } = hit;
				if (pickedMesh) {
					const { id, name } = pickedMesh;
					if (name == this.currentMesh) {
						const vec3 = pickedPoint?.clone();
						const { sphere, box } = meshes;
						if (vec3) {
							sphere.position.copyFrom(vec3);
						}
					}
					if (id == 'point') {
						this.#sphere.material.alpha = 0;
						pickedMesh.material.alpha = 1;
						pickedMesh.material.emissiveColor = Color3.Green();
					}
				}
			}
		};
		scene.onPointerUp = (ev) => {
			let hit = this.raycast();
			if (hit) {
				this.onhitcallback(hit, ev);
			}
		};
		const shadowLight = this.#lights.dirLightLeft;
		let currentMesh = (mesh) => this.setCurrentMesh(mesh);
		let rmAllPoints = () => this.rmAllPoints();
		this.#assetsManager.onTaskSuccessObservable.add(function (task) {
			scene.removeMesh(meshes.box);
			rmAllPoints();
			/**
			 * @type {Mesh}
			 */
			let mesh = task.loadedMeshes[0]; //will hold the mesh that has been loaded recently
			mesh.name = task.meshesNames;
			currentMesh(task.meshesNames);
			console.log('task successful', task.meshesNames);
			mesh.position.y = 5;
			shadowLight.includedOnlyMeshes.push(mesh);
			shadow.addShadowCaster(mesh);
			const getParentSize = (parent) => {
				const sizes = parent.getHierarchyBoundingVectors();
				const size = {
					x: sizes.max.x - sizes.min.x,
					y: sizes.max.y - sizes.min.y,
					z: sizes.max.z - sizes.min.z
				};
				return size;
			};
			let size = getParentSize(mesh);
			let mat = new StandardMaterial('mat', scene);
			// mat.alpha = 0;
			mat.emissiveColor = Color3.Blue();
			meshes.sphere.material = mat;
			// meshes.sphere.enableEdgesRendering();
			meshes.sphere.scaling.set(size.y / 10, size.y / 10, size.y / 10);
			mesh.scaling.set(0.2, 0.2, 0.2);
		});

		this.#assetsManager.onTaskErrorObservable.add(function (task) {
			console.log('task failed', task.errorObject.message, task.errorObject.exception);
		});

		// hide/show the Inspector
		window.addEventListener('keydown', (ev) => {
			// Shift+Ctrl+Alt+I
			if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
				if (scene.debugLayer.isVisible()) {
					scene.debugLayer.hide();
				} else {
					scene.debugLayer.show();
				}
			}
		});

		// run the main render loop
		engine.runRenderLoop(() => {
			scene.render();
		});
	}
	raycast() {
		let scene = this.#scene;
		let ray = scene.createPickingRay(
			scene.pointerX,
			scene.pointerY,
			Matrix.Identity(),
			this.#camera
		);
		return scene.pickWithRay(ray);
	}
	loadFile(event) {
		let files = event.target.files;
		let filename = files[0].name;
		let blob = new Blob([files[0]]);

		FilesInput.FilesToLoad[filename] = blob;

		this.#assetsManager.addMeshTask('upload', 'STL', 'file:', filename);
		this.#assetsManager.load();
	}
	onHit(func) {
		this.onhitcallback = func;
	}
	setCurrentMesh(mesh) {
		this.currentMesh = mesh;
	}
	getCurrentMesh() {
		return this.currentMesh;
	}
	isCurrentMesh(mesh) {
		return this.currentMesh == mesh.name;
	}
	addPoint(x, y, z) {
		let sphere = MeshBuilder.CreateSphere('point', { diameter: 0.1 }, this.#scene);
		sphere.scaling.copyFrom(this.#sphere.scaling.clone());
		sphere.position.set(x, y, z);
		let mat = new StandardMaterial('mat', this.#scene);
		mat.alpha = 0.5;
		mat.emissiveColor = Color3.Blue();
		sphere.material = mat;
		sphere.name = this.points.length;
		this.points.push(sphere);
		console.log(this.#camera.position);
		console.log(this.#camera.getViewMatrix());
	}
	rmPoint(index) {
		let mesh = this.points[index];
		this.#scene.removeMesh(mesh);
		delete this.points[index];
	}
	rmAllPoints() {
		for (const point of this.points) {
			this.#scene.removeMesh(point);
		}
		this.points = [];
	}
	lookAtPoint(index) {
		let mesh = this.points[index];
		this.#camera.target = mesh.position.clone();
	}
}
