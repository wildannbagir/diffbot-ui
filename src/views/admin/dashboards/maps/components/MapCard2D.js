import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import ROSLIB from 'roslib';
import {ROS_CONFIG} from 'config';
import {
  Box,
  Button,
  Icon,
  Flex,
  Text,
  useColorModeValue,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from "@chakra-ui/react";
import Card from "components/card/Card.js";
import { MdGpsFixed, MdInfo, MdNavigation, MdCheck, MdClose, MdMyLocation, MdAdd, MdDelete } from 'react-icons/md';

const MapCard2D = ({ onWaypointsUpdate, waypoints: propWaypoints, isViewOnly = false, isLoading = false, mapTopic = '/map', children, ...rest }) => {
  const mountRef = useRef(null);
  const [showInfo, setShowInfo] = useState(true);
  const [isNavGoalMode, setIsNavGoalMode] = useState(false);
  const [isLocalizationMode, setIsLocalizationMode] = useState(false);
  const [rosConnectionError, setRosConnectionError] = useState(null);
  const [isRosConnected, setIsRosConnected] = useState(false);
  const [robotPose, setRobotPose] = useState({
    x: 0, y: 0, z: 0,
    q_x: 0, q_y: 0, q_z: 0, q_w: 0
  });
  const [mapData, setMapData] = useState(null);
  const [laserPose, setLaserPose] = useState({
    x: 0, y: 0, z: 0,
    q_x: 0, q_y: 0, q_z: 0, q_w: 0
  });
  
  // Three.js objects refs
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const robotModelRef = useRef(null);
  const mapPlaneRef = useRef(null);
  const rosRef = useRef(null);
  const laserPointsRef = useRef([]); // Add ref for laser scan points
  const laserGeometryRef = useRef(null); // Add ref for reusable geometry
  const laserMaterialRef = useRef(null); // Add ref for reusable material
  const currentLaserPoseRef = useRef(null); // Add ref to store current laser pose

  // Add new refs for navigation goal objects
  const goalMarkerRef = useRef(null);
  const orientationRingRef = useRef(null);
  const orientationKnobRef = useRef(null);
  const dragPlaneRef = useRef(null);
  const pathDotsRef = useRef([]); // Add ref for path dots
  const [goalPosition, setGoalPosition] = useState({ x: 0, y: 0 });
  const [goalOrientation, setGoalOrientation] = useState(0);
  const [isDraggingGoal, setIsDraggingGoal] = useState(false);
  const [isDraggingKnob, setIsDraggingKnob] = useState(false);
  const [showGoalControls, setShowGoalControls] = useState(false);
  const [goalScreenPosition, setGoalScreenPosition] = useState({ x: 0, y: 0 });

  // Add new ref for waypoint marker
  const waypointMarkerRef = useRef(null);

  // Add new refs for relocalization objects
  const relocalizeMarkerRef = useRef(null);
  const relocalizeRingRef = useRef(null);
  const relocalizeKnobRef = useRef(null);
  const relocalizePlaneRef = useRef(null);
  const frozenLaserPointsRef = useRef([]);
  const [showRelocalizeControls, setShowRelocalizeControls] = useState(false);
  const [relocalizePosition, setRelocalizePosition] = useState({ x: 0, y: 0 });
  const [relocalizeOrientation, setRelocalizeOrientation] = useState(0);
  const [isDraggingRelocalize, setIsDraggingRelocalize] = useState(false);
  const [isDraggingRelocalizeKnob, setIsDraggingRelocalizeKnob] = useState(false);

  // Add new refs for waypoint objects
  const tempWaypointMarkerRef = useRef(null);
  const waypointRingRef = useRef(null);
  const waypointKnobRef = useRef(null);
  const waypointDragPlaneRef = useRef(null);
  const waypointsRef = useRef([]); // Store permanent waypoint markers

  // Add new refs after waypointsRef
  const waypointLabelsRef = useRef([]);
  const waypointLinesRef = useRef([]);

  // Chakra color mode
  const inputBg = useColorModeValue(
    { base: "secondaryGray.300", md: "white" },
    { base: "navy.700", md: "navy.900" }
  );
  const textColorSecondary = useColorModeValue("secondaryGray.700", "white");

  // Add new ref for waypoints
  const [waypoints, setWaypoints] = useState([]);

  // Add waypoint-related state declarations
  const [isWaypointMode, setIsWaypointMode] = useState(false);
  const [showWaypointControls, setShowWaypointControls] = useState(false);
  const [waypointPosition, setWaypointPosition] = useState({ x: 0, y: 0 });
  const [waypointOrientation, setWaypointOrientation] = useState(0);
  const [isDraggingWaypoint, setIsDraggingWaypoint] = useState(false);
  const [isDraggingWaypointKnob, setIsDraggingWaypointKnob] = useState(false);

  // Add new state declarations after existing waypoint states
  const [isEditingWaypoint, setIsEditingWaypoint] = useState(false);
  const [selectedWaypointIndex, setSelectedWaypointIndex] = useState(null);
  const [editingPosition, setEditingPosition] = useState({ x: 0, y: 0 });
  const [editingOrientation, setEditingOrientation] = useState(0);
  const [isDraggingEditWaypoint, setIsDraggingEditWaypoint] = useState(false);
  const [isDraggingEditKnob, setIsDraggingEditKnob] = useState(false);

  // Add new refs for editing UI elements
  const editRingRef = useRef(null);
  const editKnobRef = useRef(null);
  const editDragPlaneRef = useRef(null);

  // Add after other state declarations
  const [originalEditPosition, setOriginalEditPosition] = useState({ x: 0, y: 0 });
  const [originalEditOrientation, setOriginalEditOrientation] = useState(0);

  // Add new ref for edit touch circle
  const editTouchCircleRef = useRef(null);

  // Initialize ROS connection
  useEffect(() => {
    let reconnectTimer = null;
    const setupRosConnection = () => {
      if (rosRef.current) {
        // Clean up existing connection if any
        rosRef.current.close();
      }

      rosRef.current = new ROSLIB.Ros({
        url: ROS_CONFIG.ROSBRIDGE_URL
      });

      rosRef.current.on('connection', () => {
        console.log('Connected to ROS bridge');
        setIsRosConnected(true);
        setRosConnectionError(null);
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
      });

      rosRef.current.on('error', (error) => {
        console.error('ROS connection error:', error);
        setIsRosConnected(false);
        setRosConnectionError('Failed to connect to ROS. Please check if ROSbridge is running.');
      });

      rosRef.current.on('close', () => {
        console.log('ROS connection closed');
        setIsRosConnected(false);
        setRosConnectionError('Connection to ROS was closed. Attempting to reconnect...');
        
        // Attempt to reconnect after 5 seconds
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            console.log('Attempting to reconnect to ROS...');
            setupRosConnection();
          }, 5000);
        }
      });
    };

    setupRosConnection();

    // Create reusable geometry and material for laser points
    laserGeometryRef.current = new THREE.SphereGeometry(0.03);
    laserMaterialRef.current = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    // Subscribe to path updates
    const pathTopic = new ROSLIB.Topic({
      ros: rosRef.current,
      name: '/move_base/NavfnROS/plan',
      messageType: 'nav_msgs/Path',
      throttle_rate: 100  // Increased update rate from 200ms to 100ms
    });

    // Subscribe to navigation goals
    const goalTopic = new ROSLIB.Topic({
      ros: rosRef.current,
      name: '/move_base/goal',
      messageType: 'move_base_msgs/MoveBaseActionGoal'
    });

    goalTopic.subscribe((msg) => {
      // Ensure scene is ready
      if (!sceneRef.current) {
        console.warn('Scene not ready when receiving goal message');
        return;
      }

      try {
        // Remove existing waypoint marker if any
        if (waypointMarkerRef.current) {
          sceneRef.current.remove(waypointMarkerRef.current);
          waypointMarkerRef.current = null;
        }

        // Create new waypoint cone
        const waypointGeometry = new THREE.ConeGeometry(0.2, 0.4, 3);
        const waypointMaterial = new THREE.MeshBasicMaterial({
          color: 0x00ff00,
          transparent: true,
          opacity: 0.3
        });
        const waypointCone = new THREE.Mesh(waypointGeometry, waypointMaterial);
        waypointCone.position.set(msg.goal.target_pose.pose.position.x, msg.goal.target_pose.pose.position.y, 0.1);
        waypointCone.rotation.x = Math.PI;

        // Calculate orientation angle from quaternion
        const q = msg.goal.target_pose.pose.orientation;
        const angle = Math.atan2(
          2.0 * (q.w * q.z + q.x * q.y),
          1.0 - 2.0 * (q.y * q.y + q.z * q.z)
        );
        waypointCone.rotation.z = -angle - Math.PI/2;

        sceneRef.current.add(waypointCone);
        waypointMarkerRef.current = waypointCone;
      } catch (error) {
        console.error('Error creating goal marker:', error);
      }
    });

    pathTopic.subscribe((msg) => {
      // Only update path if there are significant changes
      const shouldUpdate = 
        pathDotsRef.current.length === 0 || // Always update if no path exists
        msg.poses.length === 0 || // Update if path is cleared
        (msg.poses.length > 0 && pathDotsRef.current.length > 0 && (
          // Check if start or end of path has changed significantly
          Math.abs(msg.poses[0].pose.position.x - pathDotsRef.current[0].position.x) > 0.03 ||
          Math.abs(msg.poses[0].pose.position.y - pathDotsRef.current[0].position.y) > 0.03 ||
          Math.abs(msg.poses[msg.poses.length-1].pose.position.x - pathDotsRef.current[pathDotsRef.current.length-1].position.x) > 0.03 ||
          Math.abs(msg.poses[msg.poses.length-1].pose.position.y - pathDotsRef.current[pathDotsRef.current.length-1].position.y) > 0.03
        ));

      if (shouldUpdate) {
        // Clear existing path dots
        if (sceneRef.current && pathDotsRef.current.length > 0) {
          pathDotsRef.current.forEach(dot => {
            if (dot) sceneRef.current.remove(dot);
          });
          pathDotsRef.current = [];
        }

        // Create new dots for the path
        if (msg.poses.length > 0) {
          const dotGeometry = new THREE.SphereGeometry(0.05);
          const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xff8c00, opacity: 0.5, transparent: true });

          // Reduce spacing between dots for smoother path visualization
          for (let i = 0; i < msg.poses.length; i += 8) {  // Reduced from 12 to 8
            const dot = new THREE.Mesh(dotGeometry, dotMaterial);
            dot.position.set(msg.poses[i].pose.position.x, msg.poses[i].pose.position.y, 0.05);
            sceneRef.current.add(dot);
            pathDotsRef.current.push(dot);
          }

          // Always add the last point to ensure the path reaches the goal
          if (msg.poses.length > 8 && (msg.poses.length % 8) !== 0) {
            const lastDot = new THREE.Mesh(dotGeometry, dotMaterial);
            lastDot.position.set(
              msg.poses[msg.poses.length - 1].pose.position.x,
              msg.poses[msg.poses.length - 1].pose.position.y,
              0.05
            );
            sceneRef.current.add(lastDot);
            pathDotsRef.current.push(lastDot);
          }
        }
      }
    });

    // Subscribe to goal status to clear path when reached or cancelled
    const statusTopic = new ROSLIB.Topic({
      ros: rosRef.current,
      name: '/move_base/status',
      messageType: 'actionlib_msgs/GoalStatusArray'
    });

    statusTopic.subscribe((msg) => {
      if (msg.status_list.length > 0) {
        const latestStatus = msg.status_list[msg.status_list.length - 1];
        // Status 3 means goal reached, status 2 means preempted/cancelled
        if (latestStatus.status === 3 || latestStatus.status === 2) {
          // Clear path visualization and waypoint
          if (sceneRef.current) {
            pathDotsRef.current.forEach(dot => {
              if (dot) sceneRef.current.remove(dot);
            });
            pathDotsRef.current = [];
            
            // Remove waypoint marker
            if (waypointMarkerRef.current) {
              sceneRef.current.remove(waypointMarkerRef.current);
              waypointMarkerRef.current = null;
            }
          }
        }
      }
    });

    // Subscribe to laser pose
    const laserPoseTopic = new ROSLIB.Topic({
      ros: rosRef.current,
      name: '/laser_pose',
      messageType: 'geometry_msgs/Pose'
    });

    laserPoseTopic.subscribe((msg) => {
      const newPose = {
        x: msg.position.x,
        y: msg.position.y,
        z: msg.position.z,
        q_x: msg.orientation.x,
        q_y: msg.orientation.y,
        q_z: msg.orientation.z,
        q_w: msg.orientation.w
      };
      setLaserPose(newPose);
      currentLaserPoseRef.current = newPose; // Update the ref with latest pose
    });

    // Add scan subscriber with optimized update rate
    const scanTopic = new ROSLIB.Topic({
      ros: rosRef.current,
      name: '/scan',
      messageType: 'sensor_msgs/LaserScan',
      throttle_rate: 200  // Update laser scan at 5Hz
    });

    let lastScanUpdate = 0;
    const scanUpdateInterval = 200; // Minimum time between updates in ms

    scanTopic.subscribe((msg) => {
      const now = Date.now();
      if (now - lastScanUpdate < scanUpdateInterval) return;
      lastScanUpdate = now;

      if (!sceneRef.current || !currentLaserPoseRef.current) return;

      // Clear existing laser points
      laserPointsRef.current.forEach(point => {
        if (point) sceneRef.current.remove(point);
      });
      laserPointsRef.current = [];

      const pose = currentLaserPoseRef.current;

      // Create transformation matrix from current laser pose
      const matrix = new THREE.Matrix4();
      matrix.compose(
        new THREE.Vector3(pose.x, pose.y, 0),
        new THREE.Quaternion(pose.q_x, pose.q_y, pose.q_z, pose.q_w),
        new THREE.Vector3(1, 1, 1)
      );

      // Convert laser scan to points with increased spacing
      const angleIncrement = msg.angle_increment;
      const angleMin = msg.angle_min;

      for (let i = 0; i < msg.ranges.length; i += 3) {  // Increased from 2 to 3 for better performance
        const range = msg.ranges[i];
        if (range < msg.range_min || range > msg.range_max || !isFinite(range)) continue;

        const angle = angleMin + (angleIncrement * i);
        
        // Calculate point in laser frame
        const pointVec = new THREE.Vector3(
          range * Math.cos(angle),
          range * Math.sin(angle),
          0
        );

        // Transform point to world frame
        pointVec.applyMatrix4(matrix);
        pointVec.z = 0.05;

        // Create point mesh
        const point = new THREE.Mesh(laserGeometryRef.current, laserMaterialRef.current);
        point.position.copy(pointVec);

        sceneRef.current.add(point);
        laserPointsRef.current.push(point);
      }
    });

    // Robot pose subscriber
    const robotPoseTopic = new ROSLIB.Topic({
      ros: rosRef.current,
      name: '/robot_pose',
      messageType: 'geometry_msgs/Pose',
      throttle_rate: 100  // Add throttling to limit updates to 10Hz
    });

    robotPoseTopic.subscribe((msg) => {
      // Only update if position changed significantly (1cm) to reduce unnecessary updates
      const significantChange = !robotPose ||
        Math.abs(msg.position.x - robotPose.x) > 0.01 ||
        Math.abs(msg.position.y - robotPose.y) > 0.01;

      if (significantChange) {
        setRobotPose({
          x: msg.position.x,
          y: msg.position.y,
          z: msg.position.z,
          q_x: msg.orientation.x,
          q_y: msg.orientation.y,
          q_z: msg.orientation.z,
          q_w: msg.orientation.w
        });

        // Update robot model position
        if (robotModelRef.current) {
          robotModelRef.current.position.set(msg.position.x, msg.position.y, 0.1);
          
          // Convert quaternion to Euler angles
          const quaternion = new THREE.Quaternion(
            msg.orientation.x,
            msg.orientation.y,
            msg.orientation.z,
            msg.orientation.w
          );
          const euler = new THREE.Euler().setFromQuaternion(quaternion);
          robotModelRef.current.rotation.z = euler.z - Math.PI / 2;
        }
      }
    });

    // Map subscriber
    const mapSubscriber = new ROSLIB.Topic({  // Renamed from mapTopic to mapSubscriber
      ros: rosRef.current,
      name: mapTopic,  // Use the prop
      messageType: 'nav_msgs/OccupancyGrid'
    });

    mapSubscriber.subscribe((message) => {  // Use the renamed variable
      const width = message.info.width;
      const height = message.info.height;
      const resolution = message.info.resolution;
      
      // Create canvas to draw map
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      const imageData = context.createImageData(width, height);
      
      // Convert occupancy data to image
      for (let i = 0; i < message.data.length; i++) {
        const val = message.data[i];
        const x = i % width;
        const y = height - 1 - Math.floor(i / width);
        const idx = (y * width + x) * 4;
        
        if (val === -1) { // Unknown
          imageData.data[idx] = 128;     // R
          imageData.data[idx + 1] = 128; // G
          imageData.data[idx + 2] = 128; // B
          imageData.data[idx + 3] = 255; // A
        } else {
          const color = Math.max(0, Math.min(255, (100 - val) * 2.55));
          imageData.data[idx] = color;     // R
          imageData.data[idx + 1] = color; // G
          imageData.data[idx + 2] = color; // B
          imageData.data[idx + 3] = 255;   // A
        }
      }
      
      context.putImageData(imageData, 0, 0);
      
      // Create texture from canvas
      const texture = new THREE.CanvasTexture(canvas);
      texture.flipY = true; // Flip Y to match ROS coordinate system
      
      // Update map plane
      const mapWidth = width * resolution;
      const mapHeight = height * resolution;
      
      if (mapPlaneRef.current) {
        mapPlaneRef.current.geometry = new THREE.PlaneGeometry(mapWidth, mapHeight);
        mapPlaneRef.current.material = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.DoubleSide,
          transparent: true
        });
        
        // Position the map based on origin - adjusted for RViz-like coordinate system
        mapPlaneRef.current.position.x = message.info.origin.position.x + mapWidth / 2;
        mapPlaneRef.current.position.y = message.info.origin.position.y + mapHeight / 2;
        mapPlaneRef.current.position.z = 0;
      }
      
      // Store map data for potential use
      setMapData(message);

      // Adjust camera to fit map in view
      const aspectRatio = mountRef.current.clientWidth / mountRef.current.clientHeight;
      const mapAspectRatio = mapWidth / mapHeight;
      
      let distance;
      if (mapAspectRatio > aspectRatio) {
        // Map is wider than viewport
        distance = (mapWidth / 2) / Math.tan((cameraRef.current.fov * Math.PI / 360));
      } else {
        // Map is taller than viewport
        distance = (mapHeight / 2) / Math.tan((cameraRef.current.fov * Math.PI / 360) / aspectRatio);
      }

      // Scale down the distance to get a closer view (70% of original distance)
      distance *= 0.7;

      // Update camera position
      if (mapPlaneRef.current) {
        cameraRef.current.position.set(
          mapPlaneRef.current.position.x,
          mapPlaneRef.current.position.y,
          distance
        );
        cameraRef.current.lookAt(mapPlaneRef.current.position.x, mapPlaneRef.current.position.y, 0);
        
        // Store these values for reset view
        cameraRef.current.userData.defaultPosition = {
          x: mapPlaneRef.current.position.x,
          y: mapPlaneRef.current.position.y,
          z: distance
        };
        cameraRef.current.userData.defaultTarget = {
          x: mapPlaneRef.current.position.x,
          y: mapPlaneRef.current.position.y,
          z: 0
        };
      }
    });

    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (rosRef.current) {
        rosRef.current.close();
      }
      pathTopic.unsubscribe();
      goalTopic.unsubscribe();
      statusTopic.unsubscribe();
      laserPoseTopic.unsubscribe();
      scanTopic.unsubscribe();
      robotPoseTopic.unsubscribe();
      mapSubscriber.unsubscribe();  // Add unsubscribe to cleanup

      // Clear relocalization objects
      if (sceneRef.current) {
        if (relocalizeMarkerRef.current) sceneRef.current.remove(relocalizeMarkerRef.current);
        if (frozenLaserPointsRef.current.length > 0) {
          frozenLaserPointsRef.current.forEach(point => {
            if (point) sceneRef.current.remove(point);
          });
        }
      }
      relocalizeMarkerRef.current = null;
      relocalizeRingRef.current = null;
      relocalizeKnobRef.current = null;
      relocalizePlaneRef.current = null;
      frozenLaserPointsRef.current = [];
    };
  }, [mapTopic]); // Add mapTopic to dependencies

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current && mountRef.current) {
        cameraRef.current.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Setup Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbcbcbc);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableRotate = false;
    controls.touches = {
      ONE: THREE.TOUCH.PAN,
      TWO: THREE.TOUCH.DOLLY_PAN
    };
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.panSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controlsRef.current = controls;

    // Add axes helper for reference
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    // Robot model (simple triangle for now)
    const robotGeometry = new THREE.ConeGeometry(0.2, 0.4, 3);
    const robotMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const robotModel = new THREE.Mesh(robotGeometry, robotMaterial);
    robotModel.rotation.z = -Math.PI / 2; // Make it point along X-axis in XY plane
    robotModel.position.z = 0.1; // Hover slightly above map
    scene.add(robotModel);
    robotModelRef.current = robotModel;

    // Create map plane (initially invisible)
    const planeGeometry = new THREE.PlaneGeometry(1, 1);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true
    });
    const mapPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    scene.add(mapPlane);
    mapPlaneRef.current = mapPlane;

    // Animation loop
    let animationFrameId;
    let lastRender = 0;
    const targetFPS = 30; // Limit to 30 FPS
    const frameInterval = 1000 / targetFPS;

    const animate = (timestamp) => {
      animationFrameId = requestAnimationFrame(animate);

      // Check if component is still mounted
      if (!mountRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        return;
      }

      // Throttle rendering
      const elapsed = timestamp - lastRender;
      if (elapsed < frameInterval) return;

      // Only update controls if they're being used
      if (controlsRef.current && (controlsRef.current.enabled || controlsRef.current.isDragging)) {
        controlsRef.current.update();
      }

      // Only update goal position if in nav goal mode
      if (isNavGoalMode) {
        updateGoalScreenPosition();
      }

      rendererRef.current.render(sceneRef.current, cameraRef.current);
      lastRender = timestamp;
    };
    animate();

    // Cleanup function
    return () => {
      // Cancel animation frame
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      // Safely remove the renderer's DOM element
      if (mountRef.current && rendererRef.current && rendererRef.current.domElement) {
        try {
          mountRef.current.removeChild(rendererRef.current.domElement);
        } catch (e) {
          console.warn('Error removing renderer DOM element:', e);
        }
      }

      // Dispose of Three.js resources
      if (sceneRef.current) {
        // Remove and dispose of the axes helper
        const axesHelper = sceneRef.current.children.find(child => child instanceof THREE.AxesHelper);
        if (axesHelper) {
          sceneRef.current.remove(axesHelper);
        }

        // Clean up robot model
        if (robotModelRef.current) {
          robotModelRef.current.geometry.dispose();
          robotModelRef.current.material.dispose();
          sceneRef.current.remove(robotModelRef.current);
        }

        // Clean up map plane
        if (mapPlaneRef.current) {
          mapPlaneRef.current.geometry.dispose();
          if (mapPlaneRef.current.material.map) {
            mapPlaneRef.current.material.map.dispose();
          }
          mapPlaneRef.current.material.dispose();
          sceneRef.current.remove(mapPlaneRef.current);
        }
      }

      // Dispose of renderer
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }

      // Clear all refs
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
      robotModelRef.current = null;
      mapPlaneRef.current = null;

      // Clean up waypoint labels and lines
      if (sceneRef.current) {
        waypointLabelsRef.current.forEach(label => {
          if (label) {
            if (label.material.map) label.material.map.dispose();
            label.material.dispose();
            label.geometry.dispose();
            sceneRef.current.remove(label);
          }
        });
        waypointLinesRef.current.forEach(line => {
          if (line) {
            line.material.dispose();
            line.geometry.dispose();
            sceneRef.current.remove(line);
          }
        });
      }
      waypointLabelsRef.current = [];
      waypointLinesRef.current = [];
    };
  }, []); // No dependencies, only run once

  useEffect(() => {
    if (!isNavGoalMode || !sceneRef.current) {
      // Cleanup when nav goal mode is disabled
      if (sceneRef.current) {
        if (goalMarkerRef.current) sceneRef.current.remove(goalMarkerRef.current);
        if (orientationRingRef.current) sceneRef.current.remove(orientationRingRef.current);
        if (orientationKnobRef.current) sceneRef.current.remove(orientationKnobRef.current);
        if (dragPlaneRef.current) sceneRef.current.remove(dragPlaneRef.current);
      }
      goalMarkerRef.current = null;
      orientationRingRef.current = null;
      orientationKnobRef.current = null;
      dragPlaneRef.current = null;
      setShowGoalControls(false);
      return;
    }

    // Create drag plane if it doesn't exist
    if (!dragPlaneRef.current) {
      const dragPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(1000, 1000),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      // Make drag plane parallel to the ground
      dragPlane.rotation.x = 0;
      dragPlane.position.z = 0;
      sceneRef.current.add(dragPlane);
      dragPlaneRef.current = dragPlane;
    }

    // Only create markers if they don't exist
    if (!goalMarkerRef.current) {
      // Store initial position in refs to avoid recreating markers
      const initialPosition = { x: robotPose.x, y: robotPose.y };
      const initialAngle = robotPose.q_w ? Math.atan2(
        2.0 * (robotPose.q_w * robotPose.q_z + robotPose.q_x * robotPose.q_y),
        1.0 - 2.0 * (robotPose.q_y * robotPose.q_y + robotPose.q_z * robotPose.q_z)
      ) : 0;

      // Create goal marker (orange cone)
      const goalGeometry = new THREE.ConeGeometry(0.25, 0.45, 3);
      const goalMaterial = new THREE.MeshBasicMaterial({ color: 0xff8c00 });
      const goalMarker = new THREE.Mesh(goalGeometry, goalMaterial);
      goalMarker.rotation.x = 0; //Math.PI;
      goalMarker.rotation.z = initialAngle - Math.PI/2; // Add 90 degrees to match ROS orientation
      goalMarker.position.set(initialPosition.x, initialPosition.y, 0.1);

      // Create a group to hold all goal-related objects
      const goalGroup = new THREE.Group();
      goalGroup.position.set(initialPosition.x, initialPosition.y, 0);
      sceneRef.current.add(goalGroup);
      goalMarkerRef.current = goalGroup;

      // Add the goal marker to the group with offset
      goalMarker.position.set(0, 0, 0.1);
      goalGroup.add(goalMarker);

      // Create solid circle for easier touch interaction
      const circleGeometry = new THREE.CircleGeometry(0.8, 32);
      const circleMaterial = new THREE.MeshBasicMaterial({
        color: 0x808080,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const touchCircle = new THREE.Mesh(circleGeometry, circleMaterial);
      touchCircle.rotation.x = 0;
      touchCircle.position.set(0, 0, 0.005);
      touchCircle.renderOrder = 1; // Ensure it renders after other objects
      goalGroup.add(touchCircle);

      // Create orientation ring
      const ringGeometry = new THREE.RingGeometry(0.8, 0.9, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff8c00,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
      });
      const orientationRing = new THREE.Mesh(ringGeometry, ringMaterial);
      orientationRing.rotation.x = 0;
      orientationRing.position.set(0, 0, 0.01); // Just above the touch circle
      goalGroup.add(orientationRing);
      orientationRingRef.current = orientationRing;

      // Create orientation knob
      const knobGeometry = new THREE.SphereGeometry(0.2);
      const knobMaterial = new THREE.MeshBasicMaterial({ color: 0xff8c00 });
      const orientationKnob = new THREE.Mesh(knobGeometry, knobMaterial);
      orientationKnob.position.set(
        0.85 * Math.cos(initialAngle),
        0.85 * Math.sin(initialAngle),
        0.01
      );
      goalGroup.add(orientationKnob);
      orientationKnobRef.current = orientationKnob;

      // Set initial states
      setGoalPosition(initialPosition);
      setGoalOrientation(initialAngle);
      setShowGoalControls(true);
    }

    // Mouse and touch interaction setup
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const getPointerPosition = (event, rect) => {
      // Handle both mouse and touch events
      const clientX = event.touches ? event.touches[0].clientX : event.clientX;
      const clientY = event.touches ? event.touches[0].clientY : event.clientY;
      return {
        x: ((clientX - rect.left) / rect.width) * 2 - 1,
        y: -((clientY - rect.top) / rect.height) * 2 + 1
      };
    };

    const onPointerDown = (event) => {
      if (!isNavGoalMode) return;

      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const pointer = getPointerPosition(event, rect);
      mouse.x = pointer.x;
      mouse.y = pointer.y;

      raycaster.setFromCamera(mouse, cameraRef.current);

      // Check for knob intersection first
      const knobIntersects = raycaster.intersectObject(orientationKnobRef.current);
      if (knobIntersects.length > 0) {
        setIsDraggingKnob(true);
        controlsRef.current.enabled = false;
        event.preventDefault(); // Prevent default touch behavior
        return;
      }

      // Then check for goal marker, touch circle, or ring intersection for dragging
      const goalIntersects = raycaster.intersectObjects([
        goalMarkerRef.current.children[0], // Goal marker cone
        goalMarkerRef.current.children[1], // Touch circle
        orientationRingRef.current // Ring
      ]);
      if (goalIntersects.length > 0) {
        setIsDraggingGoal(true);
        controlsRef.current.enabled = false;
        event.preventDefault(); // Prevent default touch behavior
        return;
      }

      // If none of the above, enable controls for panning
      controlsRef.current.enabled = true;
    };

    const onPointerMove = (event) => {
      if (!isNavGoalMode || (!isDraggingGoal && !isDraggingKnob)) return;

      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const pointer = getPointerPosition(event, rect);
      mouse.x = pointer.x;
      mouse.y = pointer.y;

      raycaster.setFromCamera(mouse, cameraRef.current);

      const planeIntersects = raycaster.intersectObject(dragPlaneRef.current);
      if (planeIntersects.length > 0) {
        const point = planeIntersects[0].point;

        if (isDraggingGoal) {
          // Update goal group position
          goalMarkerRef.current.position.set(point.x, point.y, 0);
          setGoalPosition({ x: point.x, y: point.y });
        } else if (isDraggingKnob) {
          const dx = point.x - goalPosition.x;
          const dy = point.y - goalPosition.y;
          const angle = Math.atan2(dy, dx);
          // Update goal marker rotation
          goalMarkerRef.current.children[0].rotation.x = Math.PI;
          goalMarkerRef.current.children[0].rotation.z = -angle - Math.PI/2;
          // Update knob position
          orientationKnobRef.current.position.set(
            0.85 * Math.cos(angle),
            0.85 * Math.sin(angle),
            0.01
          );
          setGoalOrientation(angle);
        }
        event.preventDefault(); // Prevent default touch behavior
      }
    };

    const onPointerUp = () => {
      setIsDraggingGoal(false);
      setIsDraggingKnob(false);
      controlsRef.current.enabled = true;
    };

    const canvas = rendererRef.current.domElement;
    // Add both mouse and touch event listeners
    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('touchstart', onPointerDown, { passive: false });
    canvas.addEventListener('touchmove', onPointerMove, { passive: false });
    canvas.addEventListener('touchend', onPointerUp);

    return () => {
      canvas.removeEventListener('mousedown', onPointerDown);
      canvas.removeEventListener('mousemove', onPointerMove);
      canvas.removeEventListener('mouseup', onPointerUp);
      canvas.removeEventListener('touchstart', onPointerDown);
      canvas.removeEventListener('touchmove', onPointerMove);
      canvas.removeEventListener('touchend', onPointerUp);
    };
  }, [isNavGoalMode, isDraggingGoal, isDraggingKnob, goalOrientation]);

  useEffect(() => {
    if (!isLocalizationMode || !sceneRef.current) {
      // Cleanup when localization mode is disabled
      if (sceneRef.current) {
        if (relocalizeMarkerRef.current) sceneRef.current.remove(relocalizeMarkerRef.current);
        if (relocalizePlaneRef.current) sceneRef.current.remove(relocalizePlaneRef.current);
        frozenLaserPointsRef.current.forEach(point => {
          if (point) sceneRef.current.remove(point);
        });
      }
      relocalizeMarkerRef.current = null;
      relocalizeRingRef.current = null;
      relocalizeKnobRef.current = null;
      relocalizePlaneRef.current = null;
      frozenLaserPointsRef.current = [];
      setShowRelocalizeControls(false);
      return;
    }

    // Create drag plane if it doesn't exist
    if (!relocalizePlaneRef.current) {
      const dragPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(1000, 1000),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      dragPlane.rotation.x = 0;
      dragPlane.position.z = 0;
      sceneRef.current.add(dragPlane);
      relocalizePlaneRef.current = dragPlane;
    }

    // Only create markers if they don't exist
    if (!relocalizeMarkerRef.current) {
      // Store initial position from current robot pose
      const initialPosition = { x: robotPose.x, y: robotPose.y };
      const initialAngle = robotPose.q_w ? Math.atan2(
        2.0 * (robotPose.q_w * robotPose.q_z + robotPose.q_x * robotPose.q_y),
        1.0 - 2.0 * (robotPose.q_y * robotPose.q_y + robotPose.q_z * robotPose.q_z)
      ) : 0;

      // Create relocalize marker group
      const markerGroup = new THREE.Group();
      markerGroup.position.set(initialPosition.x, initialPosition.y, 0);
      sceneRef.current.add(markerGroup);
      relocalizeMarkerRef.current = markerGroup;

      // Create robot model for relocalization
      const robotGeometry = new THREE.ConeGeometry(0.2, 0.4, 3);
      const robotMaterial = new THREE.MeshBasicMaterial({ color: 0x0066cc }); // Darker blue color
      const robotModel = new THREE.Mesh(robotGeometry, robotMaterial);
      robotModel.rotation.x = 0;
      robotModel.rotation.z = initialAngle - Math.PI/2;
      robotModel.position.set(0, 0, 0.1);
      markerGroup.add(robotModel);

      // Create touch circle
      const circleGeometry = new THREE.CircleGeometry(0.8, 32);
      const circleMaterial = new THREE.MeshBasicMaterial({
        color: 0x0066cc,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const touchCircle = new THREE.Mesh(circleGeometry, circleMaterial);
      touchCircle.rotation.x = 0;
      touchCircle.position.set(0, 0, 0.005);
      touchCircle.renderOrder = 1; // Ensure it renders after other objects
      markerGroup.add(touchCircle);

      // Create orientation ring
      const ringGeometry = new THREE.RingGeometry(0.8, 0.9, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x0066cc,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
      });
      const orientationRing = new THREE.Mesh(ringGeometry, ringMaterial);
      orientationRing.rotation.x = 0;
      orientationRing.position.set(0, 0, 0.01);
      markerGroup.add(orientationRing);
      relocalizeRingRef.current = orientationRing;

      // Create orientation knob
      const knobGeometry = new THREE.SphereGeometry(0.2);
      const knobMaterial = new THREE.MeshBasicMaterial({ color: 0x0066cc });
      const orientationKnob = new THREE.Mesh(knobGeometry, knobMaterial);
      orientationKnob.position.set(
        0.85 * Math.cos(initialAngle),
        0.85 * Math.sin(initialAngle),
        0.01
      );
      markerGroup.add(orientationKnob);
      relocalizeKnobRef.current = orientationKnob;

      // Set initial states
      setRelocalizePosition(initialPosition);
      setRelocalizeOrientation(initialAngle);
      setShowRelocalizeControls(true);

      // Capture current laser scan points
      if (laserPointsRef.current.length > 0) {
        // Create a group for laser points
        const laserGroup = new THREE.Group();
        laserGroup.position.set(0, 0, 0);
        // Set initial rotation to match the robot's initial orientation
        laserGroup.rotation.z = initialAngle;
        markerGroup.add(laserGroup);

        laserPointsRef.current.forEach(point => {
          const frozenPoint = new THREE.Mesh(
            laserGeometryRef.current,
            new THREE.MeshBasicMaterial({ color: 0x0088ff, opacity: 0.7, transparent: true })
          );
          // Calculate position relative to the marker group
          const relativePosition = new THREE.Vector3();
          relativePosition.copy(point.position);
          relativePosition.sub(new THREE.Vector3(initialPosition.x, initialPosition.y, 0));
          // Rotate the point back by initial angle to get its position relative to robot's forward direction
          relativePosition.applyAxisAngle(new THREE.Vector3(0, 0, 1), -initialAngle);
          frozenPoint.position.copy(relativePosition);
          frozenPoint.position.z = 0.02;
          
          laserGroup.add(frozenPoint);
          frozenLaserPointsRef.current.push(frozenPoint);
        });
      }
    }

    // Mouse and touch interaction setup
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const getPointerPosition = (event, rect) => {
      // Handle both mouse and touch events
      const clientX = event.touches ? event.touches[0].clientX : event.clientX;
      const clientY = event.touches ? event.touches[0].clientY : event.clientY;
      return {
        x: ((clientX - rect.left) / rect.width) * 2 - 1,
        y: -((clientY - rect.top) / rect.height) * 2 + 1
      };
    };

    const onPointerDown = (event) => {
      if (!isLocalizationMode) return;

      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const pointer = getPointerPosition(event, rect);
      mouse.x = pointer.x;
      mouse.y = pointer.y;

      raycaster.setFromCamera(mouse, cameraRef.current);

      // Check for knob intersection first
      const knobIntersects = raycaster.intersectObject(relocalizeKnobRef.current);
      if (knobIntersects.length > 0) {
        setIsDraggingRelocalizeKnob(true);
        controlsRef.current.enabled = false;
        event.preventDefault(); // Prevent default touch behavior
        return;
      }

      // Then check for marker intersection
      const markerIntersects = raycaster.intersectObjects([
        relocalizeMarkerRef.current.children[0], // Robot model
        relocalizeMarkerRef.current.children[1], // Touch circle
        relocalizeRingRef.current // Ring
      ]);
      if (markerIntersects.length > 0) {
        setIsDraggingRelocalize(true);
        controlsRef.current.enabled = false;
        event.preventDefault(); // Prevent default touch behavior
        return;
      }

      controlsRef.current.enabled = true;
    };

    const onPointerMove = (event) => {
      if (!isLocalizationMode || (!isDraggingRelocalize && !isDraggingRelocalizeKnob)) return;

      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const pointer = getPointerPosition(event, rect);
      mouse.x = pointer.x;
      mouse.y = pointer.y;

      raycaster.setFromCamera(mouse, cameraRef.current);

      const planeIntersects = raycaster.intersectObject(relocalizePlaneRef.current);
      if (planeIntersects.length > 0) {
        const point = planeIntersects[0].point;

        if (isDraggingRelocalize) {
          // Update marker group position
          relocalizeMarkerRef.current.position.set(point.x, point.y, 0);
          setRelocalizePosition({ x: point.x, y: point.y });
        } else if (isDraggingRelocalizeKnob) {
          const dx = point.x - relocalizePosition.x;
          const dy = point.y - relocalizePosition.y;
          const angle = Math.atan2(dy, dx);
          // Update robot model rotation
          relocalizeMarkerRef.current.children[0].rotation.z = angle - Math.PI/2;
          // Update knob position
          relocalizeKnobRef.current.position.set(
            0.85 * Math.cos(angle),
            0.85 * Math.sin(angle),
            0.01
          );
          // Rotate the laser points group
          const laserGroup = relocalizeMarkerRef.current.children[relocalizeMarkerRef.current.children.length - 1];
          if (laserGroup) {
            laserGroup.rotation.z = angle;
          }
          setRelocalizeOrientation(angle);
        }
        event.preventDefault(); // Prevent default touch behavior
      }
    };

    const onPointerUp = () => {
      setIsDraggingRelocalize(false);
      setIsDraggingRelocalizeKnob(false);
      controlsRef.current.enabled = true;
    };

    const canvas = rendererRef.current.domElement;
    // Add both mouse and touch event listeners
    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('touchstart', onPointerDown, { passive: false });
    canvas.addEventListener('touchmove', onPointerMove, { passive: false });
    canvas.addEventListener('touchend', onPointerUp);

    return () => {
      canvas.removeEventListener('mousedown', onPointerDown);
      canvas.removeEventListener('mousemove', onPointerMove);
      canvas.removeEventListener('mouseup', onPointerUp);
      canvas.removeEventListener('touchstart', onPointerDown);
      canvas.removeEventListener('touchmove', onPointerMove);
      canvas.removeEventListener('touchend', onPointerUp);
    };
  }, [isLocalizationMode, isDraggingRelocalize, isDraggingRelocalizeKnob, relocalizeOrientation]);

  const handleConfirmRelocalize = () => {
    if (!rosRef.current) return;

    try {
      // Create and publish pose estimate message
      const poseEstimateTopic = new ROSLIB.Topic({
        ros: rosRef.current,
        name: '/initialpose',
        messageType: 'geometry_msgs/PoseWithCovarianceStamped'
      });

      const poseMsg = new ROSLIB.Message({
        header: {
          frame_id: 'map',
          stamp: {
            secs: Math.floor(Date.now() / 1000),
            nsecs: (Date.now() % 1000) * 1000000
          }
        },
        pose: {
          pose: {
            position: {
              x: relocalizePosition.x,
              y: relocalizePosition.y,
              z: 0
            },
            orientation: {
              x: 0,
              y: 0,
              z: Math.sin(relocalizeOrientation / 2),
              w: Math.cos(relocalizeOrientation / 2)
            }
          },
          covariance: new Array(36).fill(0) // Default covariance
        }
      });

      poseEstimateTopic.publish(poseMsg);

      // Clean up
      if (sceneRef.current) {
        if (relocalizeMarkerRef.current) sceneRef.current.remove(relocalizeMarkerRef.current);
        if (relocalizePlaneRef.current) sceneRef.current.remove(relocalizePlaneRef.current);
        frozenLaserPointsRef.current.forEach(point => {
          if (point) sceneRef.current.remove(point);
        });
      }
      
      // Clear refs
      relocalizeMarkerRef.current = null;
      relocalizeRingRef.current = null;
      relocalizeKnobRef.current = null;
      relocalizePlaneRef.current = null;
      frozenLaserPointsRef.current = [];
      
      // Reset states
      setShowRelocalizeControls(false);
      setIsLocalizationMode(false);
      setRelocalizePosition({ x: 0, y: 0 });
      setRelocalizeOrientation(0);
    } catch (error) {
      console.error("Error in handleConfirmRelocalize:", error);
    }
  };

  const handleCancelRelocalize = () => {
    // Clean up
    if (sceneRef.current) {
      if (relocalizeMarkerRef.current) sceneRef.current.remove(relocalizeMarkerRef.current);
      if (relocalizePlaneRef.current) sceneRef.current.remove(relocalizePlaneRef.current);
      frozenLaserPointsRef.current.forEach(point => {
        if (point) sceneRef.current.remove(point);
      });
    }
    
    // Clear refs
    relocalizeMarkerRef.current = null;
    relocalizeRingRef.current = null;
    relocalizeKnobRef.current = null;
    relocalizePlaneRef.current = null;
    frozenLaserPointsRef.current = [];
    
    // Reset states
    setShowRelocalizeControls(false);
    setIsLocalizationMode(false);
    setRelocalizePosition({ x: 0, y: 0 });
    setRelocalizeOrientation(0);
  };

  const handleResetView = () => {
    if (cameraRef.current && controlsRef.current) {
      const camera = cameraRef.current;
      if (camera.userData.defaultPosition) {
        const pos = camera.userData.defaultPosition;
        const target = camera.userData.defaultTarget;
        camera.position.set(pos.x, pos.y, pos.z);
        camera.lookAt(target.x, target.y, target.z);
        controlsRef.current.target.set(target.x, target.y, target.z);
        controlsRef.current.update();
      }
    }
  };

  const toggleNavGoalMode = () => {
    const newMode = !isNavGoalMode;
    setIsNavGoalMode(newMode);
    
    // Clear existing refs when disabling nav mode
    if (!newMode) {
      if (sceneRef.current) {
        if (goalMarkerRef.current) sceneRef.current.remove(goalMarkerRef.current);
        if (orientationRingRef.current) sceneRef.current.remove(orientationRingRef.current);
        if (orientationKnobRef.current) sceneRef.current.remove(orientationKnobRef.current);
        if (dragPlaneRef.current) sceneRef.current.remove(dragPlaneRef.current);
      }
      goalMarkerRef.current = null;
      orientationRingRef.current = null;
      orientationKnobRef.current = null;
      dragPlaneRef.current = null;
      setShowGoalControls(false);
    }
    
    if (isLocalizationMode) setIsLocalizationMode(false);
  };

  const toggleLocalizationMode = () => {
    setIsLocalizationMode(!isLocalizationMode);
    if (isNavGoalMode) setIsNavGoalMode(false);
  };

  const handleSendGoal = () => {
    if (!rosRef.current || !sceneRef.current) return;

    try {
      // Create ROS goal message
      const goalMsg = new ROSLIB.Message({
        header: {
          frame_id: 'map',
          stamp: {
            secs: Math.floor(Date.now() / 1000),
            nsecs: (Date.now() % 1000) * 1000000
          }
        },
        goal_id: {
          stamp: {
            secs: Math.floor(Date.now() / 1000),
            nsecs: (Date.now() % 1000) * 1000000
          },
          id: ''
        },
        goal: {
          target_pose: {
            header: {
              frame_id: 'map',
              stamp: {
                secs: Math.floor(Date.now() / 1000),
                nsecs: (Date.now() % 1000) * 1000000
              }
            },
            pose: {
              position: {
                x: goalPosition.x,
                y: goalPosition.y,
                z: 0
              },
              orientation: {
                x: 0,
                y: 0,
                z: Math.sin(goalOrientation / 2),
                w: Math.cos(goalOrientation / 2)
              }
            }
          }
        }
      });

      // Create a new goal topic subscription for this specific goal
      const goalTopic = new ROSLIB.Topic({
        ros: rosRef.current,
        name: '/move_base/goal',
        messageType: 'move_base_msgs/MoveBaseActionGoal'
      });

      // Only clean up the UI controls, keep the marker
      setShowGoalControls(false);
      setIsNavGoalMode(false);

      // Ensure subscription is ready before publishing
      setTimeout(() => {
        // Publish the goal
        goalTopic.publish(goalMsg);
      }, 100); // Small delay to ensure subscription is ready
    } catch (error) {
      console.error("Error in handleSendGoal:", error);
    }
  };

  const handleCancelGoal = () => {
    if (rosRef.current) {
      // Create and publish cancel message for move_base
      const cancelTopic = new ROSLIB.Topic({
        ros: rosRef.current,
        name: '/move_base/cancel',
        messageType: 'actionlib_msgs/GoalID'
      });

      const cancelMsg = new ROSLIB.Message({
        stamp: {
          secs: 0,
          nsecs: 0
        },
        id: ''  // Empty string cancels all goals
      });

      cancelTopic.publish(cancelMsg);

      // Call cancel_path service
      const cancelPathService = new ROSLIB.Service({
        ros: rosRef.current,
        name: '/cancel_path',
        serviceType: 'std_srvs/Trigger'
      });

      const request = new ROSLIB.ServiceRequest({});

      cancelPathService.callService(request, (result) => {
        if (result.success) {
          console.log('Path execution cancelled successfully');
        } else {
          console.error('Failed to cancel path execution:', result.message);
        }
      });

      // Remove goal markers and waypoint from scene
      if (sceneRef.current) {
        if (goalMarkerRef.current) sceneRef.current.remove(goalMarkerRef.current);
        if (orientationRingRef.current) sceneRef.current.remove(orientationRingRef.current);
        if (orientationKnobRef.current) sceneRef.current.remove(orientationKnobRef.current);
        if (dragPlaneRef.current) sceneRef.current.remove(dragPlaneRef.current);
        if (waypointMarkerRef.current) sceneRef.current.remove(waypointMarkerRef.current);
      }
      
      // Clear refs
      goalMarkerRef.current = null;
      orientationRingRef.current = null;
      orientationKnobRef.current = null;
      dragPlaneRef.current = null;
      waypointMarkerRef.current = null;
      
      // Reset states
      setShowGoalControls(false);
      setIsNavGoalMode(false);
      setGoalPosition({ x: 0, y: 0 });
      setGoalOrientation(0);
    }
  };

  const updateGoalScreenPosition = () => {
    if (goalMarkerRef.current && cameraRef.current && rendererRef.current) {
      const position = goalMarkerRef.current.position.clone();
      // Move the position slightly up in 3D space to position buttons above the marker
      position.z += 0.2;
      position.project(cameraRef.current);
      
      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const x = (position.x + 1) * rect.width / 2;
      const y = (-position.y + 1) * rect.height / 2;
      
      setGoalScreenPosition({ x, y });
    }
  };

  const addWaypoint = () => {
    // Example logic to add a waypoint at the robot's current position
    const newWaypoint = { x: robotPose.x, y: robotPose.y };
    setWaypoints([...waypoints, newWaypoint]);
  };

  const toggleWaypointMode = () => {
    const newMode = !isWaypointMode;
    setIsWaypointMode(newMode);
    
    // Clear existing refs when disabling waypoint mode
    if (!newMode) {
      if (sceneRef.current) {
        if (tempWaypointMarkerRef.current) sceneRef.current.remove(tempWaypointMarkerRef.current);
        if (waypointRingRef.current) sceneRef.current.remove(waypointRingRef.current);
        if (waypointKnobRef.current) sceneRef.current.remove(waypointKnobRef.current);
        if (waypointDragPlaneRef.current) sceneRef.current.remove(waypointDragPlaneRef.current);
      }
      tempWaypointMarkerRef.current = null;
      waypointRingRef.current = null;
      waypointKnobRef.current = null;
      waypointDragPlaneRef.current = null;
      setShowWaypointControls(false);
    }
    
    if (isNavGoalMode) setIsNavGoalMode(false);
    if (isLocalizationMode) setIsLocalizationMode(false);
  };

  const handleConfirmWaypoint = () => {
    if (!sceneRef.current) return;

    try {
      const waypointIndex = waypointsRef.current.length;

      // Create permanent waypoint marker
      const waypointGeometry = new THREE.ConeGeometry(0.2, 0.4, 3);
      const waypointMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.7
      });
      const waypointCone = new THREE.Mesh(waypointGeometry, waypointMaterial);
      waypointCone.position.set(waypointPosition.x, waypointPosition.y, 0.1);
      waypointCone.rotation.x = Math.PI;
      waypointCone.rotation.z = -waypointOrientation - Math.PI/2;
      // Add user data to identify this as a waypoint
      waypointCone.userData.isWaypoint = true;
      waypointCone.userData.waypointIndex = waypointIndex;
      sceneRef.current.add(waypointCone);
      waypointsRef.current.push(waypointCone);

      // Create waypoint index label
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const context = canvas.getContext('2d');
      
      // Draw white circle background with border
      context.beginPath();
      context.arc(32, 32, 25, 0, 2 * Math.PI);
      context.fillStyle = 'white';
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = '#000000';
      context.stroke();
      
      // Draw black text
      context.fillStyle = '#000000';
      context.font = 'bold 40px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(waypointIndex + 1, 32, 32);

      const texture = new THREE.CanvasTexture(canvas);
      const labelGeometry = new THREE.PlaneGeometry(0.2, 0.2);
      const labelMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        depthTest: false
      });
      const label = new THREE.Mesh(labelGeometry, labelMaterial);
      
      // Position the label closer to the waypoint
      const offsetDistance = 0.3;
      const labelAngle = waypointOrientation + Math.PI/2;
      label.position.set(
        waypointPosition.x + offsetDistance * Math.cos(labelAngle),
        waypointPosition.y + offsetDistance * Math.sin(labelAngle),
        0.15
      );

      // Add the label to the scene
      sceneRef.current.add(label);
      waypointLabelsRef.current.push(label);

      // Add an update function to make the label face the camera
      const updateLabel = () => {
        if (label && cameraRef.current) {
          label.quaternion.copy(cameraRef.current.quaternion);
        }
      };

      // Add the update function to the animation loop
      const existingAnimate = rendererRef.current.animate;
      rendererRef.current.animate = (timestamp) => {
        updateLabel();
        existingAnimate(timestamp);
      };

      // Create line to previous waypoint if this isn't the first waypoint
      if (waypointIndex > 0) {
        const prevWaypoint = waypointsRef.current[waypointIndex - 1];
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(prevWaypoint.position.x, prevWaypoint.position.y, 0.05),
          new THREE.Vector3(waypointPosition.x, waypointPosition.y, 0.05)
        ]);
        const lineMaterial = new THREE.LineBasicMaterial({ 
          color: 0x00ff00,
          linewidth: 2,
          transparent: true,
          opacity: 0.7
        });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        sceneRef.current.add(line);
        waypointLinesRef.current.push(line);
      }

      // Update waypoints state by adding the new waypoint to the existing ones
      const newWaypoint = {
        position: { ...waypointPosition },
        orientation: waypointOrientation
      };
      
      // Create a copy of the current waypoints array
      const updatedWaypoints = [...waypoints];
      // Add the new waypoint
      updatedWaypoints[waypointIndex] = newWaypoint;
      // Update the state
      setWaypoints(updatedWaypoints);

      // Clean up temporary markers
      if (sceneRef.current) {
        if (tempWaypointMarkerRef.current) sceneRef.current.remove(tempWaypointMarkerRef.current);
        if (waypointRingRef.current) sceneRef.current.remove(waypointRingRef.current);
        if (waypointKnobRef.current) sceneRef.current.remove(waypointKnobRef.current);
        if (waypointDragPlaneRef.current) sceneRef.current.remove(waypointDragPlaneRef.current);
      }
      
      // Clear refs
      tempWaypointMarkerRef.current = null;
      waypointRingRef.current = null;
      waypointKnobRef.current = null;
      waypointDragPlaneRef.current = null;
      
      // Reset states
      setShowWaypointControls(false);
      setIsWaypointMode(false);
      setWaypointPosition({ x: 0, y: 0 });
      setWaypointOrientation(0);
    } catch (error) {
      console.error("Error in handleConfirmWaypoint:", error);
    }
  };

  const handleCancelWaypoint = () => {
    // Clean up temporary markers
    if (sceneRef.current) {
      if (tempWaypointMarkerRef.current) sceneRef.current.remove(tempWaypointMarkerRef.current);
      if (waypointRingRef.current) sceneRef.current.remove(waypointRingRef.current);
      if (waypointKnobRef.current) sceneRef.current.remove(waypointKnobRef.current);
      if (waypointDragPlaneRef.current) sceneRef.current.remove(waypointDragPlaneRef.current);
    }
    
    // Clear refs
    tempWaypointMarkerRef.current = null;
    waypointRingRef.current = null;
    waypointKnobRef.current = null;
    waypointDragPlaneRef.current = null;
    
    // Reset states
    setShowWaypointControls(false);
    setIsWaypointMode(false);
    setWaypointPosition({ x: 0, y: 0 });
    setWaypointOrientation(0);
  };

  // Add new useEffect for waypoint mode
  useEffect(() => {
    if (!isWaypointMode || !sceneRef.current) {
      // Cleanup when waypoint mode is disabled
      if (sceneRef.current) {
        if (tempWaypointMarkerRef.current) sceneRef.current.remove(tempWaypointMarkerRef.current);
        if (waypointRingRef.current) sceneRef.current.remove(waypointRingRef.current);
        if (waypointKnobRef.current) sceneRef.current.remove(waypointKnobRef.current);
        if (waypointDragPlaneRef.current) sceneRef.current.remove(waypointDragPlaneRef.current);
      }
      tempWaypointMarkerRef.current = null;
      waypointRingRef.current = null;
      waypointKnobRef.current = null;
      waypointDragPlaneRef.current = null;
      setShowWaypointControls(false);
      return;
    }

    // Create drag plane if it doesn't exist
    if (!waypointDragPlaneRef.current) {
      const dragPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(1000, 1000),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      dragPlane.rotation.x = 0;
      dragPlane.position.z = 0;
      sceneRef.current.add(dragPlane);
      waypointDragPlaneRef.current = dragPlane;
    }

    // Only create markers if they don't exist
    if (!tempWaypointMarkerRef.current) {
      // Store initial position in refs to avoid recreating markers
      const initialPosition = { x: robotPose.x, y: robotPose.y };
      const initialAngle = robotPose.q_w ? Math.atan2(
        2.0 * (robotPose.q_w * robotPose.q_z + robotPose.q_x * robotPose.q_y),
        1.0 - 2.0 * (robotPose.q_y * robotPose.q_y + robotPose.q_z * robotPose.q_z)
      ) : 0;

      // Create waypoint marker group
      const markerGroup = new THREE.Group();
      markerGroup.position.set(initialPosition.x, initialPosition.y, 0);
      sceneRef.current.add(markerGroup);
      tempWaypointMarkerRef.current = markerGroup;

      // Create waypoint cone
      const waypointGeometry = new THREE.ConeGeometry(0.25, 0.45, 3);
      const waypointMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const waypointCone = new THREE.Mesh(waypointGeometry, waypointMaterial);
      waypointCone.rotation.x = 0;
      waypointCone.rotation.z = initialAngle - Math.PI/2;
      waypointCone.position.set(0, 0, 0.1);
      markerGroup.add(waypointCone);

      // Create touch circle
      const circleGeometry = new THREE.CircleGeometry(0.8, 32);
      const circleMaterial = new THREE.MeshBasicMaterial({
        color: 0x808080,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const touchCircle = new THREE.Mesh(circleGeometry, circleMaterial);
      touchCircle.rotation.x = 0;
      touchCircle.position.set(0, 0, 0.005);
      touchCircle.renderOrder = 1;
      markerGroup.add(touchCircle);

      // Create orientation ring
      const ringGeometry = new THREE.RingGeometry(0.8, 0.9, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
      });
      const orientationRing = new THREE.Mesh(ringGeometry, ringMaterial);
      orientationRing.rotation.x = 0;
      orientationRing.position.set(0, 0, 0.01);
      markerGroup.add(orientationRing);
      waypointRingRef.current = orientationRing;

      // Create orientation knob
      const knobGeometry = new THREE.SphereGeometry(0.2);
      const knobMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const orientationKnob = new THREE.Mesh(knobGeometry, knobMaterial);
      orientationKnob.position.set(
        0.85 * Math.cos(initialAngle),
        0.85 * Math.sin(initialAngle),
        0.01
      );
      markerGroup.add(orientationKnob);
      waypointKnobRef.current = orientationKnob;

      // Set initial states
      setWaypointPosition(initialPosition);
      setWaypointOrientation(initialAngle);
      setShowWaypointControls(true);
    }

    // Mouse and touch interaction setup
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const getPointerPosition = (event, rect) => {
      // Handle both mouse and touch events
      const clientX = event.touches ? event.touches[0].clientX : event.clientX;
      const clientY = event.touches ? event.touches[0].clientY : event.clientY;
      return {
        x: ((clientX - rect.left) / rect.width) * 2 - 1,
        y: -((clientY - rect.top) / rect.height) * 2 + 1
      };
    };

    const onPointerDown = (event) => {
      if (!isWaypointMode) return;

      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const pointer = getPointerPosition(event, rect);
      mouse.x = pointer.x;
      mouse.y = pointer.y;

      raycaster.setFromCamera(mouse, cameraRef.current);

      // Check for knob intersection first
      const knobIntersects = raycaster.intersectObject(waypointKnobRef.current);
      if (knobIntersects.length > 0) {
        setIsDraggingWaypointKnob(true);
        controlsRef.current.enabled = false;
        event.preventDefault(); // Prevent default touch behavior
        return;
      }

      // Then check for waypoint marker intersection
      const markerIntersects = raycaster.intersectObjects([
        tempWaypointMarkerRef.current.children[0], // Waypoint cone
        tempWaypointMarkerRef.current.children[1], // Touch circle
        waypointRingRef.current // Ring
      ]);
      if (markerIntersects.length > 0) {
        setIsDraggingWaypoint(true);
        controlsRef.current.enabled = false;
        event.preventDefault(); // Prevent default touch behavior
        return;
      }

      controlsRef.current.enabled = true;
    };

    const onPointerMove = (event) => {
      if (!isWaypointMode || (!isDraggingWaypoint && !isDraggingWaypointKnob)) return;

      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const pointer = getPointerPosition(event, rect);
      mouse.x = pointer.x;
      mouse.y = pointer.y;

      raycaster.setFromCamera(mouse, cameraRef.current);

      const planeIntersects = raycaster.intersectObject(waypointDragPlaneRef.current);
      if (planeIntersects.length > 0) {
        const point = planeIntersects[0].point;

        if (isDraggingWaypoint) {
          // Update marker group position
          tempWaypointMarkerRef.current.position.set(point.x, point.y, 0);
          setWaypointPosition({ x: point.x, y: point.y });
        } else if (isDraggingWaypointKnob) {
          const dx = point.x - waypointPosition.x;
          const dy = point.y - waypointPosition.y;
          const angle = Math.atan2(dy, dx);
          // Update waypoint cone rotation
          tempWaypointMarkerRef.current.children[0].rotation.z = angle - Math.PI/2;
          // Update knob position
          waypointKnobRef.current.position.set(
            0.85 * Math.cos(angle),
            0.85 * Math.sin(angle),
            0.01
          );
          setWaypointOrientation(angle);
        }
        event.preventDefault(); // Prevent default touch behavior
      }
    };

    const onPointerUp = () => {
      setIsDraggingWaypoint(false);
      setIsDraggingWaypointKnob(false);
      controlsRef.current.enabled = true;
    };

    const canvas = rendererRef.current.domElement;
    // Add both mouse and touch event listeners
    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('touchstart', onPointerDown, { passive: false });
    canvas.addEventListener('touchmove', onPointerMove, { passive: false });
    canvas.addEventListener('touchend', onPointerUp);

    return () => {
      canvas.removeEventListener('mousedown', onPointerDown);
      canvas.removeEventListener('mousemove', onPointerMove);
      canvas.removeEventListener('mouseup', onPointerUp);
      canvas.removeEventListener('touchstart', onPointerDown);
      canvas.removeEventListener('touchmove', onPointerMove);
      canvas.removeEventListener('touchend', onPointerUp);
    };
  }, [isWaypointMode, isDraggingWaypoint, isDraggingWaypointKnob, waypointOrientation]);

  // Add new function to handle waypoint selection
  const handleWaypointClick = (index) => {
    // If already editing a waypoint, don't allow selecting another one
    if (isEditingWaypoint) {
      return; // Exit early if already editing
    }

    const waypoint = waypointsRef.current[index];
    if (!waypoint) return;

    // Store original position and orientation
    setOriginalEditPosition({
      x: waypoint.position.x,
      y: waypoint.position.y
    });
    const orientation = -waypoint.rotation.z - Math.PI/2;
    setOriginalEditOrientation(orientation);

    setIsEditingWaypoint(true);
    setSelectedWaypointIndex(index);
    setEditingPosition({
      x: waypoint.position.x,
      y: waypoint.position.y
    });
    setEditingOrientation(orientation);

    // Disable other modes
    setIsWaypointMode(false);
    setIsNavGoalMode(false);
    setIsLocalizationMode(false);
  };

  // Add function to exit edit mode
  const exitEditMode = () => {
    setIsEditingWaypoint(false);
    setSelectedWaypointIndex(null);
    setEditingPosition({ x: 0, y: 0 });
    setEditingOrientation(0);
    
    // Clean up edit UI elements
    if (sceneRef.current) {
      if (editRingRef.current) sceneRef.current.remove(editRingRef.current);
      if (editKnobRef.current) sceneRef.current.remove(editKnobRef.current);
      if (editDragPlaneRef.current) sceneRef.current.remove(editDragPlaneRef.current);
    }
    editRingRef.current = null;
    editKnobRef.current = null;
    editDragPlaneRef.current = null;
  };

  // Add function to handle waypoint deletion
  const handleDeleteWaypoint = () => {
    if (!isEditingWaypoint || selectedWaypointIndex === null) return;

    // Remove waypoint from scene
    if (sceneRef.current && waypointsRef.current[selectedWaypointIndex]) {
      sceneRef.current.remove(waypointsRef.current[selectedWaypointIndex]);
      
      // Remove label
      if (waypointLabelsRef.current[selectedWaypointIndex]) {
        sceneRef.current.remove(waypointLabelsRef.current[selectedWaypointIndex]);
      }

      // Remove connecting lines
      if (waypointLinesRef.current[selectedWaypointIndex]) {
        sceneRef.current.remove(waypointLinesRef.current[selectedWaypointIndex]);
      }
      if (selectedWaypointIndex > 0 && waypointLinesRef.current[selectedWaypointIndex - 1]) {
        sceneRef.current.remove(waypointLinesRef.current[selectedWaypointIndex - 1]);
      }
    }

    // Create a sparse array with length one less than current waypoints
    const totalWaypoints = waypointsRef.current.length - 1;
    const updatedWaypoints = new Array(totalWaypoints).fill(undefined);
    
    // Copy all waypoints except the deleted one
    waypointsRef.current.forEach((waypoint, index) => {
        if (index !== selectedWaypointIndex) {
            const newIndex = index > selectedWaypointIndex ? index - 1 : index;
            updatedWaypoints[newIndex] = {
                position: {
                    x: waypoint.position.x,
                    y: waypoint.position.y,
                    z: waypoint.position.z || 0
                },
                orientation: -waypoint.rotation.z - Math.PI/2
            };
        }
    });

    // Update arrays
    waypointsRef.current.splice(selectedWaypointIndex, 1);
    waypointLabelsRef.current.splice(selectedWaypointIndex, 1);
    waypointLinesRef.current.splice(selectedWaypointIndex - 1, 2);
    
    // Update state with the sparse array
    setWaypoints(updatedWaypoints);
    // Update state
    // setWaypoints(waypoints.filter((_, i) => i !== selectedWaypointIndex));

    // Update indices for remaining waypoints
    waypointsRef.current.forEach((waypoint, index) => {
      waypoint.userData.waypointIndex = index;

      // Update label
      if (waypointLabelsRef.current[index]) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        
        context.beginPath();
        context.arc(32, 32, 25, 0, 2 * Math.PI);
        context.fillStyle = 'white';
        context.fill();
        context.lineWidth = 2;
        context.strokeStyle = '#000000';
        context.stroke();
        
        context.fillStyle = '#000000';
        context.font = 'bold 40px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(index + 1, 32, 32);

        const texture = new THREE.CanvasTexture(canvas);
        waypointLabelsRef.current[index].material.map = texture;
        waypointLabelsRef.current[index].material.map.needsUpdate = true;
      }

      // Update connecting lines
      if (index > 0) {
        const prevWaypoint = waypointsRef.current[index - 1];
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(prevWaypoint.position.x, prevWaypoint.position.y, 0.05),
          new THREE.Vector3(waypoint.position.x, waypoint.position.y, 0.05)
        ]);
        if (waypointLinesRef.current[index - 1]) {
          waypointLinesRef.current[index - 1].geometry.dispose();
          waypointLinesRef.current[index - 1].geometry = lineGeometry;
        } else {
          const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0x00ff00,
            linewidth: 2,
            transparent: true,
            opacity: 0.7
          });
          const line = new THREE.Line(lineGeometry, lineMaterial);
          sceneRef.current.add(line);
          waypointLinesRef.current[index - 1] = line;
        }
      }
    });

    exitEditMode();
  };

  // Add new function to handle edit confirmation
  const handleConfirmEdit = () => {
    if (!isEditingWaypoint || selectedWaypointIndex === null) return;

    const waypoint = waypointsRef.current[selectedWaypointIndex];
    if (!waypoint) return;

    // Update waypoint position and orientation
    waypoint.position.set(editingPosition.x, editingPosition.y, 0.1);
    waypoint.rotation.x = Math.PI;
    waypoint.rotation.z = -editingOrientation - Math.PI/2;

    // Update label position
    if (waypointLabelsRef.current[selectedWaypointIndex]) {
      const label = waypointLabelsRef.current[selectedWaypointIndex];
      const offsetDistance = 0.3;
      const labelAngle = editingOrientation + Math.PI/2;
      label.position.set(
        editingPosition.x + offsetDistance * Math.cos(labelAngle),
        editingPosition.y + offsetDistance * Math.sin(labelAngle),
        0.15
      );
    }

    // Update connecting lines
    if (selectedWaypointIndex > 0) {
      const prevWaypoint = waypointsRef.current[selectedWaypointIndex - 1];
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(prevWaypoint.position.x, prevWaypoint.position.y, 0.05),
        new THREE.Vector3(editingPosition.x, editingPosition.y, 0.05)
      ]);
      waypointLinesRef.current[selectedWaypointIndex - 1].geometry.dispose();
      waypointLinesRef.current[selectedWaypointIndex - 1].geometry = lineGeometry;
    }
    if (selectedWaypointIndex < waypointsRef.current.length - 1) {
      const nextWaypoint = waypointsRef.current[selectedWaypointIndex + 1];
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(editingPosition.x, editingPosition.y, 0.05),
        new THREE.Vector3(nextWaypoint.position.x, nextWaypoint.position.y, 0.05)
      ]);
      waypointLinesRef.current[selectedWaypointIndex].geometry.dispose();
      waypointLinesRef.current[selectedWaypointIndex].geometry = lineGeometry;
    }

    // // Update waypoints state
    // const updatedWaypoints = [...waypoints];
    // updatedWaypoints[selectedWaypointIndex] = {
    //   position: { ...editingPosition },
    //   orientation: editingOrientation
    // };
    // Create a sparse array with the same length as the total number of waypoints
    const totalWaypoints = waypointsRef.current.length;
    const updatedWaypoints = new Array(totalWaypoints).fill(undefined);
    
    // Add only the edited waypoint at its index
    updatedWaypoints[selectedWaypointIndex] = {
      position: { ...editingPosition },
      orientation: editingOrientation
    };
    setWaypoints(updatedWaypoints);

    exitEditMode();
  };

  // Add new useEffect for editing mode after other useEffects
  useEffect(() => {
    if (!isEditingWaypoint || selectedWaypointIndex === null || !sceneRef.current) {
      return;
    }

    // Create drag plane if it doesn't exist
    if (!editDragPlaneRef.current) {
      const dragPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(1000, 1000),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      dragPlane.rotation.x = 0;
      dragPlane.position.z = 0;
      sceneRef.current.add(dragPlane);
      editDragPlaneRef.current = dragPlane;
    }

    // Create solid circle for touch interaction
    if (!editTouchCircleRef.current) {
      const circleGeometry = new THREE.CircleGeometry(0.8, 32);
      const circleMaterial = new THREE.MeshBasicMaterial({
        color: 0x808080,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const touchCircle = new THREE.Mesh(circleGeometry, circleMaterial);
      touchCircle.rotation.x = 0;
      touchCircle.position.set(editingPosition.x, editingPosition.y, 0.005);
      touchCircle.renderOrder = 1;
      sceneRef.current.add(touchCircle);
      editTouchCircleRef.current = touchCircle;
    }

    // Create orientation ring
    if (!editRingRef.current) {
      const ringGeometry = new THREE.RingGeometry(0.8, 0.9, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = 0;
      ring.position.set(editingPosition.x, editingPosition.y, 0.01);
      sceneRef.current.add(ring);
      editRingRef.current = ring;
    }

    // Create orientation knob
    if (!editKnobRef.current) {
      const knobGeometry = new THREE.SphereGeometry(0.2);
      const knobMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const knob = new THREE.Mesh(knobGeometry, knobMaterial);
      const knobAngle = editingOrientation;
      knob.position.set(
        editingPosition.x + 0.85 * Math.cos(knobAngle),
        editingPosition.y + 0.85 * Math.sin(knobAngle),
        0.01
      );
      sceneRef.current.add(knob);
      editKnobRef.current = knob;
    }

    // Mouse and touch interaction setup
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const getPointerPosition = (event, rect) => {
      // Handle both mouse and touch events
      const clientX = event.touches ? event.touches[0].clientX : event.clientX;
      const clientY = event.touches ? event.touches[0].clientY : event.clientY;
      return {
        x: ((clientX - rect.left) / rect.width) * 2 - 1,
        y: -((clientY - rect.top) / rect.height) * 2 + 1
      };
    };

    const onPointerDown = (event) => {
      if (!isEditingWaypoint) return;

      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const pointer = getPointerPosition(event, rect);
      mouse.x = pointer.x;
      mouse.y = pointer.y;

      raycaster.setFromCamera(mouse, cameraRef.current);

      // Check for knob intersection first
      const knobIntersects = raycaster.intersectObject(editKnobRef.current);
      if (knobIntersects.length > 0) {
        setIsDraggingEditKnob(true);
        controlsRef.current.enabled = false;
        event.preventDefault(); // Prevent default touch behavior
        return;
      }

      // Check for waypoint or ring intersection
      const waypointIntersects = raycaster.intersectObjects([
        waypointsRef.current[selectedWaypointIndex],
        editRingRef.current,
        editTouchCircleRef.current // Add touch circle to intersection check
      ]);
      if (waypointIntersects.length > 0) {
        setIsDraggingEditWaypoint(true);
        controlsRef.current.enabled = false;
        event.preventDefault(); // Prevent default touch behavior
        return;
      }

      controlsRef.current.enabled = true;
    };

    const onPointerMove = (event) => {
      if (!isEditingWaypoint || (!isDraggingEditWaypoint && !isDraggingEditKnob)) return;

      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const pointer = getPointerPosition(event, rect);
      mouse.x = pointer.x;
      mouse.y = pointer.y;

      raycaster.setFromCamera(mouse, cameraRef.current);

      const planeIntersects = raycaster.intersectObject(editDragPlaneRef.current);
      if (planeIntersects.length > 0) {
        const point = planeIntersects[0].point;

        if (isDraggingEditWaypoint) {
          // Update position
          setEditingPosition({ x: point.x, y: point.y });
          
          // Update ring position
          if (editRingRef.current) {
            editRingRef.current.position.set(point.x, point.y, 0.01);
          }

          // Update touch circle position
          if (editTouchCircleRef.current) {
            editTouchCircleRef.current.position.set(point.x, point.y, 0.005);
          }
          
          // Update knob position
          if (editKnobRef.current) {
            editKnobRef.current.position.set(
              point.x + 0.85 * Math.cos(editingOrientation),
              point.y + 0.85 * Math.sin(editingOrientation),
              0.01
            );
          }

          // Update waypoint marker position in real-time
          const waypoint = waypointsRef.current[selectedWaypointIndex];
          if (waypoint) {
            waypoint.position.set(point.x, point.y, 0.1);
          }

          // Update connecting lines in real-time
          if (selectedWaypointIndex > 0 && waypointLinesRef.current[selectedWaypointIndex - 1]) {
            const prevWaypoint = waypointsRef.current[selectedWaypointIndex - 1];
            const lineGeometry = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(prevWaypoint.position.x, prevWaypoint.position.y, 0.05),
              new THREE.Vector3(point.x, point.y, 0.05)
            ]);
            waypointLinesRef.current[selectedWaypointIndex - 1].geometry.dispose();
            waypointLinesRef.current[selectedWaypointIndex - 1].geometry = lineGeometry;
          }
          if (selectedWaypointIndex < waypointsRef.current.length - 1 && waypointLinesRef.current[selectedWaypointIndex]) {
            const nextWaypoint = waypointsRef.current[selectedWaypointIndex + 1];
            const lineGeometry = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(point.x, point.y, 0.05),
              new THREE.Vector3(nextWaypoint.position.x, nextWaypoint.position.y, 0.05)
            ]);
            waypointLinesRef.current[selectedWaypointIndex].geometry.dispose();
            waypointLinesRef.current[selectedWaypointIndex].geometry = lineGeometry;
          }

          // Update label position in real-time
          if (waypointLabelsRef.current[selectedWaypointIndex]) {
            const label = waypointLabelsRef.current[selectedWaypointIndex];
            const offsetDistance = 0.3;
            const labelAngle = editingOrientation + Math.PI/2;
            label.position.set(
              point.x + offsetDistance * Math.cos(labelAngle),
              point.y + offsetDistance * Math.sin(labelAngle),
              0.15
            );
          }
        } else if (isDraggingEditKnob) {
          const dx = point.x - editingPosition.x;
          const dy = point.y - editingPosition.y;
          const angle = Math.atan2(dy, dx);
          setEditingOrientation(angle);
          
          // Update knob position
          if (editKnobRef.current) {
            editKnobRef.current.position.set(
              editingPosition.x + 0.85 * Math.cos(angle),
              editingPosition.y + 0.85 * Math.sin(angle),
              0.01
            );
          }

          // Update waypoint rotation in real-time
          const waypoint = waypointsRef.current[selectedWaypointIndex];
          if (waypoint) {
            waypoint.rotation.x = Math.PI;
            waypoint.rotation.z = -angle - Math.PI/2;
          }

          // Update label position for orientation change
          if (waypointLabelsRef.current[selectedWaypointIndex]) {
            const label = waypointLabelsRef.current[selectedWaypointIndex];
            const offsetDistance = 0.3;
            const labelAngle = angle + Math.PI/2;
            label.position.set(
              editingPosition.x + offsetDistance * Math.cos(labelAngle),
              editingPosition.y + offsetDistance * Math.sin(labelAngle),
              0.15
            );
          }
        }
      }
    };

    const onPointerUp = () => {
      setIsDraggingEditWaypoint(false);
      setIsDraggingEditKnob(false);
      controlsRef.current.enabled = true;
    };

    const canvas = rendererRef.current.domElement;
    // Add both mouse and touch event listeners
    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('touchstart', onPointerDown, { passive: false });
    canvas.addEventListener('touchmove', onPointerMove, { passive: false });
    canvas.addEventListener('touchend', onPointerUp);

    return () => {
      canvas.removeEventListener('mousedown', onPointerDown);
      canvas.removeEventListener('mousemove', onPointerMove);
      canvas.removeEventListener('mouseup', onPointerUp);
      canvas.removeEventListener('touchstart', onPointerDown);
      canvas.removeEventListener('touchmove', onPointerMove);
      canvas.removeEventListener('touchend', onPointerUp);
      
      // Clean up edit UI elements
      if (sceneRef.current) {
        if (editRingRef.current) sceneRef.current.remove(editRingRef.current);
        if (editKnobRef.current) sceneRef.current.remove(editKnobRef.current);
        if (editDragPlaneRef.current) sceneRef.current.remove(editDragPlaneRef.current);
        if (editTouchCircleRef.current) sceneRef.current.remove(editTouchCircleRef.current);
      }
      editRingRef.current = null;
      editKnobRef.current = null;
      editDragPlaneRef.current = null;
      editTouchCircleRef.current = null;
    };
  }, [isEditingWaypoint, selectedWaypointIndex, isDraggingEditWaypoint, isDraggingEditKnob, editingPosition, editingOrientation]);

  // Add new function to handle canceling edit
  const handleCancelEdit = () => {
    if (!isEditingWaypoint || selectedWaypointIndex === null) return;

    const waypoint = waypointsRef.current[selectedWaypointIndex];
    if (!waypoint) return;

    // Restore original position and orientation
    waypoint.position.set(originalEditPosition.x, originalEditPosition.y, 0.1);
    waypoint.rotation.x = Math.PI;
    waypoint.rotation.z = -originalEditOrientation - Math.PI/2;

    // Restore label position
    if (waypointLabelsRef.current[selectedWaypointIndex]) {
      const label = waypointLabelsRef.current[selectedWaypointIndex];
      const offsetDistance = 0.3;
      const labelAngle = originalEditOrientation + Math.PI/2;
      label.position.set(
        originalEditPosition.x + offsetDistance * Math.cos(labelAngle),
        originalEditPosition.y + offsetDistance * Math.sin(labelAngle),
        0.15
      );
    }

    // Restore connecting lines
    if (selectedWaypointIndex > 0) {
      const prevWaypoint = waypointsRef.current[selectedWaypointIndex - 1];
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(prevWaypoint.position.x, prevWaypoint.position.y, 0.05),
        new THREE.Vector3(originalEditPosition.x, originalEditPosition.y, 0.05)
      ]);
      waypointLinesRef.current[selectedWaypointIndex - 1].geometry.dispose();
      waypointLinesRef.current[selectedWaypointIndex - 1].geometry = lineGeometry;
    }
    if (selectedWaypointIndex < waypointsRef.current.length - 1) {
      const nextWaypoint = waypointsRef.current[selectedWaypointIndex + 1];
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(originalEditPosition.x, originalEditPosition.y, 0.05),
        new THREE.Vector3(nextWaypoint.position.x, nextWaypoint.position.y, 0.05)
      ]);
      waypointLinesRef.current[selectedWaypointIndex].geometry.dispose();
      waypointLinesRef.current[selectedWaypointIndex].geometry = lineGeometry;
    }

    exitEditMode();
  };

  // Add waypoint click detection to the main scene interaction
  useEffect(() => {
    if (!sceneRef.current || !rendererRef.current) return;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (event) => {
      // Don't handle clicks if in any other mode except editing
      if (isNavGoalMode || isLocalizationMode || isWaypointMode || 
          isDraggingGoal || isDraggingKnob || isDraggingWaypoint || isDraggingWaypointKnob ||
          isDraggingRelocalize || isDraggingRelocalizeKnob || isDraggingEditWaypoint || isDraggingEditKnob ||
          isViewOnly
        ) {
        return;
      }

      const rect = rendererRef.current.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);

      // Check for intersection with waypoints
      const intersects = raycaster.intersectObjects(
        waypointsRef.current.filter(waypoint => waypoint.userData.isWaypoint)
      );

      if (intersects.length > 0) {
        const waypoint = intersects[0].object;
        // Allow selecting the same waypoint again or a different one
        handleWaypointClick(waypoint.userData.waypointIndex);
      } else if (isEditingWaypoint) {
        // If clicking outside any waypoint while editing, do nothing
        // This prevents accidentally exiting edit mode
        return;
      }
    };

    const canvas = rendererRef.current.domElement;
    canvas.addEventListener('click', onClick);

    return () => {
      canvas.removeEventListener('click', onClick);
    };
  }, [isNavGoalMode, isLocalizationMode, isWaypointMode, isDraggingGoal, isDraggingKnob,
      isDraggingWaypoint, isDraggingWaypointKnob, isDraggingRelocalize, isDraggingRelocalizeKnob,
      isDraggingEditWaypoint, isDraggingEditKnob, isEditingWaypoint]);

  // Update parent component whenever waypoints change
  useEffect(() => {
    if (onWaypointsUpdate) {
      onWaypointsUpdate(waypoints);
    }
  }, [waypoints, onWaypointsUpdate]);

  // Add effect to handle prop waypoints
  useEffect(() => {
    if (propWaypoints) {
      // Clear existing waypoints, labels, and lines
      waypointsRef.current.forEach(wp => sceneRef.current.remove(wp));
      waypointLabelsRef.current.forEach(label => sceneRef.current.remove(label));
      waypointLinesRef.current.forEach(line => sceneRef.current.remove(line));
      waypointsRef.current = [];
      waypointLabelsRef.current = [];
      waypointLinesRef.current = [];
      
      // Add waypoints from props
      propWaypoints.forEach((wp, index) => {
        // Create waypoint marker
        const waypointGeometry = new THREE.ConeGeometry(0.2, 0.4, 3);
        const waypointMaterial = new THREE.MeshBasicMaterial({
          color: 0x00ff00,
          transparent: true,
          opacity: 0.7
        });
        const waypointMesh = new THREE.Mesh(waypointGeometry, waypointMaterial);
        waypointMesh.position.set(wp.position.x, wp.position.y, 0.1);
        waypointMesh.rotation.x = Math.PI;
        waypointMesh.rotation.z = -wp.orientation - Math.PI/2;
        waypointMesh.userData.isWaypoint = true;
        waypointMesh.userData.waypointIndex = index;
        sceneRef.current.add(waypointMesh);
        waypointsRef.current.push(waypointMesh);

        // Create waypoint label
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        
        context.beginPath();
        context.arc(32, 32, 25, 0, 2 * Math.PI);
        context.fillStyle = 'white';
        context.fill();
        context.lineWidth = 2;
        context.strokeStyle = '#000000';
        context.stroke();
        
        context.fillStyle = '#000000';
        context.font = 'bold 40px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(index + 1, 32, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const labelGeometry = new THREE.PlaneGeometry(0.2, 0.2);
        const labelMaterial = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
          depthTest: false
        });
        const label = new THREE.Mesh(labelGeometry, labelMaterial);
        
        // Position the label
        const offsetDistance = 0.3;
        const labelAngle = wp.orientation + Math.PI/2;
        label.position.set(
          wp.position.x + offsetDistance * Math.cos(labelAngle),
          wp.position.y + offsetDistance * Math.sin(labelAngle),
          0.15
        );

        sceneRef.current.add(label);
        waypointLabelsRef.current.push(label);

        // Add line to previous waypoint if not the first one
        if (index > 0) {
          const prevWaypoint = propWaypoints[index - 1];
          const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(prevWaypoint.position.x, prevWaypoint.position.y, 0.05),
            new THREE.Vector3(wp.position.x, wp.position.y, 0.05)
          ]);
          const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0x00ff00,
            linewidth: 2,
            transparent: true,
            opacity: 0.7
          });
          const line = new THREE.Line(lineGeometry, lineMaterial);
          sceneRef.current.add(line);
          waypointLinesRef.current.push(line);
        }

        // Add update function to make label face the camera
        const updateLabel = () => {
          if (label && cameraRef.current) {
            label.quaternion.copy(cameraRef.current.quaternion);
          }
        };

        // Add the update function to the animation loop
        const existingAnimate = rendererRef.current.animate;
        rendererRef.current.animate = (timestamp) => {
          updateLabel();
          existingAnimate(timestamp);
        };
      });
    }
  }, [propWaypoints]);

  // Modify click handler to respect view-only mode
  const handleClick = (event) => {
    if (isViewOnly) return; // Don't handle clicks in view-only mode
    
    // ... rest of existing click handler code ...
  };

  // Modify mouse move handler to respect view-only mode
  const handleMouseMove = (event) => {
    if (isViewOnly) return; // Don't handle mouse move in view-only mode
    
    // ... rest of existing mouse move handler code ...
  };

  // Modify mouse up handler to respect view-only mode
  const handleMouseUp = () => {
    if (isViewOnly) return; // Don't handle mouse up in view-only mode
    
    // ... rest of existing mouse up handler code ...
  };

  return (
    <Card
      justifyContent='center'
      position='relative'
      direction='column'
      w='100%'
      p='20px'
      zIndex='0'
      minH={{ base: "600px", lg: "100%" }}
      {...rest}
    >
      <Box position="relative" width="100%" height="100%" minHeight="600px">
        {isLoading && (
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg="rgba(0, 0, 0, 0.5)"
            zIndex="1000"
          >
            <Text color="white">Loading path...</Text>
          </Box>
        )}
        {/* ROS Connection Error Alert */}
        {rosConnectionError && (
          <Alert
            status="error"
            variant="solid"
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            maxW="md"
            zIndex="3"
            borderRadius="xl"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            textAlign="center"
            py={4}
          >
            <AlertIcon boxSize="40px" mr={0} />
            <AlertTitle mt={4} mb={1} fontSize="lg">
              ROS Connection Error
            </AlertTitle>
            <AlertDescription maxWidth="sm">
              {rosConnectionError}
            </AlertDescription>
          </Alert>
        )}

        {/* Controls */}
        <Flex
          position="absolute"
          top="20px"
          right="20px"
          direction="column"
          gap="10px"
          zIndex="2"
        >
          <Button
            onClick={handleResetView}
            borderRadius='50%'
            ms={{ base: "14px", md: "auto" }}
            bg='gray.100'
            w={{ base: "45px", md: "70px" }}
            h={{ base: "45px", md: "70px" }}
            minW={{ base: "45px", md: "70px" }}
            minH={{ base: "45px", md: "70px" }}
            variant='no-hover'
          >
            <Icon 
              as={MdGpsFixed} 
              color='secondaryGray.700'
              w={{ base: "18px", md: "25px" }}
              h={{ base: "18px", md: "25px" }}
            />
          </Button>
          <Button
            onClick={() => setShowInfo(!showInfo)}
            borderRadius='50%'
            ms={{ base: "14px", md: "auto" }}
            bg='gray.100'
            w={{ base: "45px", md: "70px" }}
            h={{ base: "45px", md: "70px" }}
            minW={{ base: "45px", md: "70px" }}
            minH={{ base: "45px", md: "70px" }}
            variant='no-hover'
          >
            <Icon 
              as={MdInfo} 
              color='secondaryGray.700'
              w={{ base: "18px", md: "25px" }}
              h={{ base: "18px", md: "25px" }}
            />
          </Button>
          <Button
            onClick={toggleNavGoalMode}
            borderRadius='50%'
            ms={{ base: "14px", md: "auto" }}
            bg={isNavGoalMode ? 'blue.400' : 'gray.100'}
            w={{ base: "45px", md: "70px" }}
            h={{ base: "45px", md: "70px" }}
            minW={{ base: "45px", md: "70px" }}
            minH={{ base: "45px", md: "70px" }}
            variant='no-hover'
            display={isViewOnly ? 'none' : 'block'}
          >
            <Icon 
              as={MdNavigation}
              color={isNavGoalMode ? 'white' : 'secondaryGray.700'}
              w={{ base: "18px", md: "25px" }}
              h={{ base: "18px", md: "25px" }}
            />
          </Button>
          <Button
            onClick={toggleLocalizationMode}
            borderRadius='50%'
            ms={{ base: "14px", md: "auto" }}
            bg={isLocalizationMode ? 'blue.400' : 'gray.100'}
            w={{ base: "45px", md: "70px" }}
            h={{ base: "45px", md: "70px" }}
            minW={{ base: "45px", md: "70px" }}
            minH={{ base: "45px", md: "70px" }}
            variant='no-hover'
            display={isViewOnly ? 'none' : 'block'}
          >
            <Icon 
              as={MdMyLocation}
              color={isLocalizationMode ? 'white' : 'secondaryGray.700'}
              w={{ base: "18px", md: "25px" }}
              h={{ base: "18px", md: "25px" }}
            />
          </Button>
          <Button
            onClick={toggleWaypointMode}
            borderRadius='50%'
            ms={{ base: "14px", md: "auto" }}
            bg={isWaypointMode ? 'blue.400' : 'gray.100'}
            w={{ base: "45px", md: "70px" }}
            h={{ base: "45px", md: "70px" }}
            minW={{ base: "45px", md: "70px" }}
            minH={{ base: "45px", md: "70px" }}
            variant='no-hover'
            display={isViewOnly ? 'none' : 'block'}
          >
            <Icon 
              as={MdAdd} 
              color={isWaypointMode ? 'white' : 'secondaryGray.700'}
              w={{ base: "18px", md: "25px" }}
              h={{ base: "18px", md: "25px" }}
            />
          </Button>
          {/* Cancel Goal Button */}
          <Button
            onClick={handleCancelGoal}
            borderRadius='50%'
            ms={{ base: "14px", md: "auto" }}
            bg={pathDotsRef.current.length > 0 ? 'red.400' : 'gray.100'}
            w={{ base: "45px", md: "70px" }}
            h={{ base: "45px", md: "70px" }}
            minW={{ base: "45px", md: "70px" }}
            minH={{ base: "45px", md: "70px" }}
            variant='no-hover'
            display={isViewOnly ? 'none' : 'block'}
          >
            <Icon 
              as={MdClose}
              color={pathDotsRef.current.length > 0 ? 'white' : 'red.500'}
              w={{ base: "18px", md: "25px" }}
              h={{ base: "18px", md: "25px" }}
            />
          </Button>
        </Flex>

        {/* Info Panel */}
        {showInfo && (
          <Box
            position="absolute"
            bottom="20px"
            left="20px"
            bg={inputBg}
            borderRadius="xl"
            boxShadow="lg"
            p={4}
            minW="200px"
            zIndex="2"
          >
            <Text fontSize="lg" fontWeight="bold" mb={2}>
              Robot Info:
            </Text>
            <Flex direction="column" gap={2}>
              <Flex justify="space-between">
                <Text color={textColorSecondary}>Status: </Text>
                <Text fontWeight="medium">Active</Text>
              </Flex>
              <Flex justify="space-between">
                <Text color={textColorSecondary}>Position: </Text>
                <Text fontWeight="medium">
                  X: {robotPose.x.toFixed(2)}, Y: {robotPose.y.toFixed(2)}
                </Text>
              </Flex>
              <Flex justify="space-between">
                <Text color={textColorSecondary}>Orientation: </Text>
                <Text fontWeight="medium">
                  {(Math.atan2(2 * (robotPose.q_w * robotPose.q_z + robotPose.q_x * robotPose.q_y),
                    1 - 2 * (robotPose.q_y * robotPose.q_y + robotPose.q_z * robotPose.q_z)) * 180 / Math.PI).toFixed(0)}°
                </Text>
              </Flex>
            </Flex>
          </Box>
        )}

        {/* Goal Control Buttons */}
        {showGoalControls && (
          <Flex
            position="absolute"
            left="50%"
            top="20px"
            transform="translateX(-50%)"
            gap="10px"
            zIndex="2"
          >
            <Button
              onClick={handleSendGoal}
              borderRadius="full"
              colorScheme="green"
              size="md"
            >
              <Icon as={MdCheck} w="20px" h="20px" />
            </Button>
            <Button
              onClick={handleCancelGoal}
              borderRadius="full"
              colorScheme="red"
              size="md"
            >
              <Icon as={MdClose} w="20px" h="20px" />
            </Button>
          </Flex>
        )}

        {/* Relocalization Control Buttons */}
        {showRelocalizeControls && (
          <Flex
            position="absolute"
            left="50%"
            top="20px"
            transform="translateX(-50%)"
            gap="10px"
            zIndex="2"
          >
            <Button
              onClick={handleConfirmRelocalize}
              borderRadius="full"
              colorScheme="green"
              size="md"
            >
              <Icon as={MdCheck} w="20px" h="20px" />
            </Button>
            <Button
              onClick={handleCancelRelocalize}
              borderRadius="full"
              colorScheme="red"
              size="md"
            >
              <Icon as={MdClose} w="20px" h="20px" />
            </Button>
          </Flex>
        )}

        {/* Waypoint Control Buttons */}
        {showWaypointControls && (
          <Flex
            position="absolute"
            left="50%"
            top="20px"
            transform="translateX(-50%)"
            gap="10px"
            zIndex="2"
          >
            <Button
              onClick={handleConfirmWaypoint}
              borderRadius="full"
              colorScheme="green"
              size="md"
            >
              <Icon as={MdCheck} w="20px" h="20px" />
            </Button>
            <Button
              onClick={handleCancelWaypoint}
              borderRadius="full"
              colorScheme="red"
              size="md"
            >
              <Icon as={MdClose} w="20px" h="20px" />
            </Button>
          </Flex>
        )}

        {/* Three.js Container */}
        <div 
          ref={mountRef}
          style={{ 
            width: '100%', 
            height: '100%',
            minHeight: '600px',
            borderRadius: '15px',
            overflow: 'hidden'
          }}
        />
      </Box>

      {/* Add Editing Controls */}
      {isEditingWaypoint && (
        <Flex
          position="absolute"
          left="50%"
          top="20px"
          transform="translateX(-50%)"
          gap="10px"
          zIndex="2"
        >
          <Button
            onClick={handleConfirmEdit}
            borderRadius="full"
            colorScheme="green"
            size="md"
          >
            <Icon as={MdCheck} w="20px" h="20px" />
          </Button>
          <Button
            onClick={handleCancelEdit}
            borderRadius="full"
            colorScheme="gray"
            size="md"
          >
            <Icon as={MdClose} w="20px" h="20px" />
          </Button>
          <Button
            onClick={handleDeleteWaypoint}
            borderRadius="full"
            colorScheme="red"
            size="md"
          >
            <Icon as={MdDelete} w="20px" h="20px" />
          </Button>
        </Flex>
      )}

      {/* Render children (buttons) */}
      {children}
    </Card>
  );
};

export default MapCard2D; 