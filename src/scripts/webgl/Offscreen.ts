import * as THREE from 'three'
import { three } from './core/Three'
import fsLeft from './shader/fsLeft.glsl'
import fsRight from './shader/fsRight.glsl'
import fsCenter from './shader/fsCenter.glsl'
import vertexShader from './shader/vertexShader.glsl'
import html2canvas from 'html2canvas'

export class Offscreen {
  private renderTarget = new THREE.WebGLRenderTarget(three.size.width, three.size.height)
  private scene = new THREE.Scene()
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 10)
  private planes = new THREE.Group()

  async generate() {
    this.camera.position.z = 1
    this.addEvents()
    const textures = await this.loadTextures()
    await this.createPlanes(textures[0])
  }

  private async loadTextures() {
    const loader = new THREE.TextureLoader()
    const paths = ['text.jpg']

    return await Promise.all(
      paths.map(async (path) => {
        const texture = await loader.loadAsync(import.meta.env.BASE_URL + 'images/' + path)
        texture.name = path.split('.')[0]
        return texture
      }),
    )
  }

  private async createPlanes(texture: THREE.Texture) {
    this.scene.add(this.planes)

    const geometry = new THREE.PlaneGeometry(2, 2)
    {
      // left
      const material = new THREE.RawShaderMaterial({
        uniforms: {
          tImage: { value: texture },
        },
        vertexShader,
        fragmentShader: fsLeft,
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.name = 'left'
      this.planes.add(mesh)
      this.syncViewer(mesh, 'left')
    }
    {
      // center
      const video = document.querySelector<HTMLVideoElement>('.viewer.center video')!
      await video.play()
      const texture = new THREE.VideoTexture(video)
      texture.colorSpace = THREE.SRGBColorSpace
      const aspect = 3456 / 2158

      const material = new THREE.RawShaderMaterial({
        uniforms: {
          tImage: { value: texture },
          uCoveredScale: { value: [1 / aspect, 1] },
        },
        vertexShader,
        fragmentShader: fsCenter,
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.name = 'center'
      this.planes.add(mesh)
      this.syncViewer(mesh, 'center')
    }
    {
      // right
      const target = document.querySelector<HTMLElement>('.viewer.right .area')!
      const rect = target.getBoundingClientRect()
      const canvas = await html2canvas(target, { width: rect.width, height: rect.height, backgroundColor: '#000', logging: false })
      const texture = new THREE.CanvasTexture(canvas)

      const material = new THREE.RawShaderMaterial({
        uniforms: {
          tImage: { value: texture },
        },
        vertexShader,
        fragmentShader: fsRight,
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.name = 'right'
      this.planes.add(mesh)
      this.syncViewer(mesh, 'right')
    }
  }

  private syncViewer(mesh: THREE.Object3D, pos: 'left' | 'center' | 'right') {
    const area = document.querySelector<HTMLElement>(`.viewer.${pos} .area`)!
    const rect = area.getBoundingClientRect()
    const width = rect.width / window.innerWidth
    const height = rect.height / window.innerHeight
    const centerX = (rect.width / 2 + rect.x - window.innerWidth / 2) * 2
    const centerY = (window.innerHeight / 2 - (rect.height / 2 + rect.y)) * 2
    const x = centerX / window.innerWidth
    const y = centerY / window.innerHeight
    mesh.scale.set(width, height, 1)
    mesh.position.set(x, y, 0)
  }

  private addEvents() {
    three.addEventListener('resize', () => {
      this.renderTarget.setSize(three.size.width, three.size.height)
      this.camera.updateProjectionMatrix()

      for (let child of this.planes.children) {
        this.syncViewer(child, child.name as 'left' | 'center' | 'right')
      }
    })
  }

  get texture() {
    return this.renderTarget.texture
  }

  render() {
    three.renderer.setRenderTarget(this.renderTarget)
    three.renderer.render(this.scene, this.camera)
    three.renderer.setRenderTarget(null)
  }
}
