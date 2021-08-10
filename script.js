const scene = new THREE.Scene()
scene.background = new THREE.Color('gray')

const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 )

const renderer = new THREE.WebGLRenderer()
renderer.setSize( window.innerWidth, window.innerHeight )
document.body.appendChild( renderer.domElement )

const geometry = new THREE.BoxGeometry()
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } )

const planeGeom = new THREE.PlaneGeometry(10,10)
planeGeom.rotateX(Math.PI/2)
planeGeom.translate(0,-1,0)
const planeMat = new THREE.MeshLambertMaterial({color: 0xffffff, side: THREE.DoubleSide})
const plane = new THREE.Mesh( planeGeom, planeMat )
scene.add( plane )

const light = new THREE.HemisphereLight()
scene.add( light );

camera.position.z = 5
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.update()

const loader = new THREE.GLTFLoader()
loader.load(
    'cat.glb',
    function (gltf) {
        console.log('cat loaded')
        scene.add(gltf.scene)
    }
)

const animate = function () {
    requestAnimationFrame( animate )

    controls.update()
    renderer.render( scene, camera )
}

animate()
