import * as THREE from 'three'
import { three } from './core/Three'
import fragmentShader from './shader/debrisFs.glsl'
import vertexShader from './shader/debrisVs.glsl'
import { Offscreen } from './Offscreen'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'

export class Canvas {
  private offscreen: Offscreen
  private debris = new THREE.Group()
  private debriMaterial!: THREE.RawShaderMaterial

  constructor(canvas: HTMLCanvasElement) {
    this.init(canvas)

    this.offscreen = new Offscreen()
    this.load().then((model) => {
      this.createDebri(model)
      this.addEvents()
      three.animation(this.anime)
    })
  }

  private async load() {
    await this.offscreen.generate()
    const model = await this.loadModel()
    return model.scene
  }

  private async loadModel() {
    const gltfLoader = new GLTFLoader()
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
    gltfLoader.setDRACOLoader(dracoLoader)

    const model = await gltfLoader.loadAsync(import.meta.env.BASE_URL + '/models/debri.glb')

    dracoLoader.dispose()
    return model
  }

  private init(canvas: HTMLCanvasElement) {
    three.setup(canvas)
    three.camera.position.z = 5
    three.controls.enableDamping = true
    three.controls.dampingFactor = 0.15
  }

  private createDebri(model: THREE.Group) {
    three.scene.add(this.debris)

    const material = new THREE.RawShaderMaterial({
      uniforms: {
        tOffscreen: { value: this.offscreen.texture },
        uResolution: { value: [three.size.width, three.size.height] },
      },
      vertexShader,
      fragmentShader,
    })
    this.debriMaterial = material

    {
      const debri = model.children.find((c) => c.name === 'debri_01') as THREE.Mesh
      const mesh = new THREE.Mesh(debri.geometry, material)
      mesh.position.x = -2.5
      mesh.scale.multiplyScalar(2)
      this.debris.add(mesh)
    }
    {
      const debri = model.children.find((c) => c.name === 'debri_02') as THREE.Mesh
      const mesh = new THREE.Mesh(debri.geometry, material)
      mesh.scale.multiplyScalar(2)
      this.debris.add(mesh)
    }
    {
      const debri = model.children.find((c) => c.name === 'debri_03') as THREE.Mesh
      const mesh = new THREE.Mesh(debri.geometry, material)
      mesh.position.x = 2.5
      mesh.scale.multiplyScalar(2)
      this.debris.add(mesh)
    }
  }

  private addEvents() {
    three.addEventListener('resize', () => {
      this.debriMaterial.uniforms.uResolution.value = [three.size.width, three.size.height]
    })
  }

  private anime = () => {
    three.controls.update()

    this.debris.children.forEach((c) => {
      c.rotation.x += three.time.delta * 0.2 * 1
      c.rotation.y += three.time.delta * 0.2 * 2
      c.rotation.z += three.time.delta * 0.2 * 3
    })

    this.offscreen.render()
    three.render()
  }

  dispose() {
    three.dispose()
  }
}
