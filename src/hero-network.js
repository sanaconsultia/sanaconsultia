import * as THREE from 'three';

const root = document.querySelector('#hero-network');
const canvas = root?.querySelector('canvas');

if (root && canvas) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileQuery = window.matchMedia('(max-width: 700px)');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 30);
  camera.position.z = 5.2;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
  } catch {
    root.classList.add('is-fallback');
  }

  if (renderer) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    const network = new THREE.Group();
    scene.add(network);

    let nodePositions = [];
    let adjacency = [];
    let pulses = [];
    let pulseGeometry;
    let pulseMaterial;
    let pulsePoints;
    let nodes;
    let lineSegments;
    let frameId = 0;
    let lastFrameTime = 0;
    let inView = false;
    let previousMobileState = mobileQuery.matches;
    const pointer = new THREE.Vector2();
    const targetRotation = new THREE.Vector2();

    function addEdge(edgeSet, from, to) {
      const a = Math.min(from, to);
      const b = Math.max(from, to);
      edgeSet.add(`${a}:${b}`);
    }

    function makeConnections(points) {
      const edgeSet = new Set();
      const connected = new Set([0]);

      while (connected.size < points.length) {
        let bestFrom = -1;
        let bestTo = -1;
        let bestDistance = Infinity;

        for (const from of connected) {
          for (let to = 0; to < points.length; to += 1) {
            if (connected.has(to)) continue;
            const distance = points[from].distanceToSquared(points[to]);
            if (distance < bestDistance) {
              bestDistance = distance;
              bestFrom = from;
              bestTo = to;
            }
          }
        }

        addEdge(edgeSet, bestFrom, bestTo);
        connected.add(bestTo);
      }

      points.forEach((point, index) => {
        const nearest = points
          .map((other, otherIndex) => ({
            index: otherIndex,
            distance: point.distanceToSquared(other),
          }))
          .filter((other) => other.index !== index)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 3);

        nearest.forEach((other) => addEdge(edgeSet, index, other.index));
      });

      return [...edgeSet].map((edge) => edge.split(':').map(Number));
    }

    function disposeNetwork() {
      network.traverse((object) => {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material?.dispose();
        }
      });
      network.clear();
    }

    function buildNetwork() {
      disposeNetwork();

      const isMobile = mobileQuery.matches;
      const nodeCount = isMobile ? 46 : 96;
      const pulseCount = isMobile ? 14 : 30;
      const radius = 1.65;

      nodePositions = Array.from({ length: nodeCount }, () => {
        const z = Math.random() * 2 - 1;
        const angle = Math.random() * Math.PI * 2;
        const depth = Math.cbrt(Math.random()) * radius;
        const ring = Math.sqrt(1 - z * z) * depth;
        return new THREE.Vector3(
          Math.cos(angle) * ring,
          Math.sin(angle) * ring,
          z * depth,
        );
      });

      const connections = makeConnections(nodePositions);
      adjacency = Array.from({ length: nodeCount }, () => []);
      const linePositions = new Float32Array(connections.length * 6);

      connections.forEach(([from, to], index) => {
        adjacency[from].push(to);
        adjacency[to].push(from);
        linePositions.set([
          ...nodePositions[from].toArray(),
          ...nodePositions[to].toArray(),
        ], index * 6);
      });

      const lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
      lineSegments = new THREE.LineSegments(
        lineGeometry,
        new THREE.LineBasicMaterial({
          color: 0xf3eee2,
          transparent: true,
          opacity: 0.2,
          depthWrite: false,
        }),
      );
      network.add(lineSegments);

      const nodeGeometry = new THREE.BufferGeometry();
      nodeGeometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(nodePositions.flatMap((position) => position.toArray()), 3),
      );
      nodes = new THREE.Points(
        nodeGeometry,
        new THREE.PointsMaterial({
          color: 0x5fd1a8,
          size: isMobile ? 0.055 : 0.065,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
        }),
      );
      network.add(nodes);

      pulses = Array.from({ length: pulseCount }, () => {
        const from = Math.floor(Math.random() * nodeCount);
        const to = adjacency[from][Math.floor(Math.random() * adjacency[from].length)];
        return {
          from,
          to,
          progress: Math.random(),
          speed: 0.22 + Math.random() * 0.42,
        };
      });

      pulseGeometry = new THREE.BufferGeometry();
      pulseGeometry.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(pulseCount * 4 * 3), 3).setUsage(THREE.DynamicDrawUsage),
      );
      pulseGeometry.setAttribute(
        'color',
        new THREE.BufferAttribute(new Float32Array(pulseCount * 4 * 3), 3).setUsage(THREE.DynamicDrawUsage),
      );
      pulseMaterial = new THREE.PointsMaterial({
        size: isMobile ? 0.085 : 0.095,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      pulsePoints = new THREE.Points(pulseGeometry, pulseMaterial);
      network.add(pulsePoints);
      pulsePoints.visible = !reducedMotion.matches;
      updatePulsePositions();
    }

    function updatePulsePositions() {
      if (!pulseGeometry || !pulsePoints) return;

      const positions = pulseGeometry.attributes.position.array;
      const colors = pulseGeometry.attributes.color.array;
      const amber = new THREE.Color(0xe8a33d);

      pulses.forEach((pulse, pulseIndex) => {
        const from = nodePositions[pulse.from];
        const to = nodePositions[pulse.to];
        const direction = new THREE.Vector3().subVectors(to, from);

        for (let pointIndex = 0; pointIndex < 4; pointIndex += 1) {
          const progress = Math.max(0, pulse.progress - pointIndex * 0.075);
          const position = from.clone().addScaledVector(direction, progress);
          const offset = (pulseIndex * 4 + pointIndex) * 3;
          const fade = [1, 0.5, 0.22, 0.08][pointIndex];
          positions[offset] = position.x;
          positions[offset + 1] = position.y;
          positions[offset + 2] = position.z;
          colors[offset] = amber.r * fade;
          colors[offset + 1] = amber.g * fade;
          colors[offset + 2] = amber.b * fade;
        }
      });

      pulseGeometry.attributes.position.needsUpdate = true;
      pulseGeometry.attributes.color.needsUpdate = true;
    }

    function chooseNextNode(node, previousNode) {
      const choices = adjacency[node].filter((candidate) => candidate !== previousNode);
      const options = choices.length ? choices : adjacency[node];
      return options[Math.floor(Math.random() * options.length)];
    }

    function resize() {
      const width = Math.max(root.clientWidth, 1);
      const height = Math.max(root.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      if (previousMobileState !== mobileQuery.matches) {
        previousMobileState = mobileQuery.matches;
        buildNetwork();
      }

      renderer.render(scene, camera);
    }

    function renderFrame(time) {
      frameId = 0;
      if (!inView || document.hidden) return;

      const delta = lastFrameTime ? Math.min((time - lastFrameTime) / 1000, 0.05) : 0;
      lastFrameTime = time;

      if (!reducedMotion.matches) {
        pulses.forEach((pulse) => {
          pulse.progress += pulse.speed * delta;
          if (pulse.progress >= 1) {
            const previousNode = pulse.from;
            pulse.from = pulse.to;
            pulse.to = chooseNextNode(pulse.from, previousNode);
            pulse.progress -= 1;
          }
        });
        updatePulsePositions();
        targetRotation.set(pointer.y * 0.08, pointer.x * 0.12);
        network.rotation.x += (targetRotation.x - network.rotation.x) * 0.025;
        network.rotation.y += (targetRotation.y - network.rotation.y) * 0.025 + delta * 0.012;
      }

      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(renderFrame);
    }

    function syncAnimation() {
      const shouldAnimate = inView && !document.hidden && !reducedMotion.matches;
      if (shouldAnimate && !frameId) {
        lastFrameTime = 0;
        frameId = window.requestAnimationFrame(renderFrame);
      } else if (!shouldAnimate && frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
        renderer.render(scene, camera);
      }
    }

    buildNetwork();
    resize();
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', (event) => {
      pointer.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        (event.clientY / window.innerHeight) * 2 - 1,
      );
    }, { passive: true });
    document.addEventListener('visibilitychange', syncAnimation);
    reducedMotion.addEventListener('change', () => {
      pulsePoints.visible = !reducedMotion.matches;
      if (reducedMotion.matches) {
        network.rotation.set(0, 0, 0);
      }
      renderer.render(scene, camera);
      syncAnimation();
    });

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        syncAnimation();
      }, { threshold: 0.01 });
      observer.observe(root);
    } else {
      inView = true;
      syncAnimation();
    }
  }
}
