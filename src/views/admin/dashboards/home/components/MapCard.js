import React, { useState, useEffect, useRef } from "react";
import { Stage, Layer, Image, Group, Circle, Line, Shape } from "react-konva";
import useImage from "use-image";
import { 
  RosConnection, 
  ImageViewer, 
  Subscriber, 
  TopicListProvider, 
  useMsg, 
  useTopicList, 
  Publisher, 
  Param, 
  useParam, 
  ParamListProvider, 
  useParamList, 
  ServiceListProvider, 
  useServiceList, 
  ServiceCaller, 
  ServiceServer,
  useSubscription
} from "rosreact";
import ROSLIB from "roslib";
import {ROS_CONFIG} from 'config';
import * as Three from "three";
import {
  Box,
  Button,
  Icon,
  Flex,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
// Custom components
import Card from "components/card/Card.js";
// import Map from "react-map-gl";
import MapImage from 'assets/img/dashboards/house_map.png';

// Assets
import "mapbox-gl/dist/mapbox-gl.css";
import { MdLocationOn, MdInfo, MdZoomIn, MdGpsFixed } from "react-icons/md";
import { IoPaperPlane } from "react-icons/io5";

const MapCard = (props) => {
  const { ...rest } = props;
  const [mapImage] = useImage(MapImage);
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const [stageDimensions, setStageDimensions] = useState({width: 0, height: 0});
  const [mapDimensions, setMapDimensions] = useState({width: 0, height: 0});
  const [stageScale, setStageScale] = useState(1);
  const [stageX, setStageX] = useState(0);
  const [stageY, setStageY] = useState(0);
  const [showInfo, setShowInfo] = useState(true);
  const [localizeMode, setLocalizeMode] = useState(false);
  const [robotPose, setRobotPose] = useState({
    x: 0, y: 0, z: 0,
    q_x: 0, q_y: 0, q_z: 0, q_w: 0
  });
  const [robotPoseCanvas, setRobotPoseCanvas] = useState({
    x: 0,
    y: 0,
    theta: 0
  });
  const [laserPose, setLaserPose] = useState({
    x: 0, y: 0, z: 0,
    q_x: 0, q_y: 0, q_z: 0, q_w: 0
  });
  const [laserPoseCanvas, setLaserPoseCanvas] = useState({
    x: 0,
    y: 0,
    theta: 0
  }); 
  const [laserScan, setLaserScan] = useState([])

  const mapResolution = 0.05;

  useEffect(() => {
    // Create a ROS connection
    const ros = new ROSLIB.Ros({
      url: ROS_CONFIG.ROSBRIDGE_URL // Replace with your actual ROSBridge URL
    });

    // Subscribe to /robot_pose
    const robotPoseTopic = new ROSLIB.Topic({
      ros: ros,
      name: '/robot_pose',
      messageType: 'geometry_msgs/Pose'
    });

    robotPoseTopic.subscribe((robotPoseMsg) => {
      if (!robotPoseMsg) {
        console.log("Waiting for /robot_pose topic...");
      }
      if (robotPoseMsg) {
        setRobotPose({
          x: robotPoseMsg.position.x,
          y: robotPoseMsg.position.y,
          z: robotPoseMsg.position.z,
          q_x: robotPoseMsg.orientation.x,
          q_y: robotPoseMsg.orientation.y,
          q_z: robotPoseMsg.orientation.z,
          q_w: robotPoseMsg.orientation.w
        });
        setRobotPoseCanvas({
          x: getCanvasPoseX(robotPoseMsg.position.x),
          y: getCanvasPoseY(robotPoseMsg.position.y),
          theta: getCanvasOrientation(robotPoseMsg.orientation)
        });
      }
    });

    // Subscribe to /laser_pose
    const laserPoseTopic = new ROSLIB.Topic({
      ros: ros,
      name: '/laser_pose',
      messageType: 'geometry_msgs/Pose'
    });

    laserPoseTopic.subscribe((laserPoseMsg) => {
      if (!laserPoseMsg) {
        console.log("Waiting for /laser_pose topic...");
      }
      if (laserPoseMsg) {
        setLaserPose({
          x: laserPoseMsg.position.x,
          y: laserPoseMsg.position.y,
          z: laserPoseMsg.position.z,
          q_x: laserPoseMsg.orientation.x,
          q_y: laserPoseMsg.orientation.y,
          q_z: laserPoseMsg.orientation.z,
          q_w: laserPoseMsg.orientation.w
        });
        setLaserPoseCanvas({
          x: getCanvasPoseX(laserPoseMsg.position.x),
          y: getCanvasPoseY(laserPoseMsg.position.y),
          theta: getCanvasOrientation(laserPoseMsg.orientation)
        });
      }
    });

    // Subscribe to /scan
    const laserScanTopic = new ROSLIB.Topic({
      ros: ros,
      name: '/scan',
      messageType: 'sensor_msgs/LaserScan'
    });

    laserScanTopic.subscribe((laserScanMsg) => {
      if (!laserScanMsg) {
        console.log("Waiting for /scan topic...");
      }
      if (laserScanMsg) {
        var point_scanx = 0;
        var point_scany = 0;
        var points_skip = 1; //consider only every points_skip points
        var n = laserScanMsg.ranges.length;
        var points_array = [];
        for (var i = 0; i < n; i += points_skip) {
          var range = laserScanMsg.ranges[i];
          if (range >= laserScanMsg.range_min && range <= laserScanMsg.range_max) {
            var angle = laserScanMsg.angle_min + i * laserScanMsg.angle_increment;
            point_scanx = getCanvasPoseX(
              range *
                Math.cos(
                  angle +
                    degrees_to_radians(
                      -(laserPoseCanvas.theta + 90) + 180
                    )
                )
            );
            point_scany = getCanvasPoseY(
              range *
                Math.sin(
                  angle +
                    degrees_to_radians(
                      -(laserPoseCanvas.theta + 90) + 180
                    )
                )
            );
            point_scanx += laserPoseCanvas.x - 10;
            point_scany += laserPoseCanvas.y + 10;
          }
          points_array.push([point_scanx, point_scany]);
        }
        setLaserScan(points_array);
      }
    });

    // Cleanup subscriptions on component unmount
    return () => {
        robotPoseTopic.unsubscribe();
        laserPoseTopic.unsubscribe();
        laserScanTopic.unsubscribe();
        ros.close();
    };
  }, []);

  // const robotPoseCallback = (robotPoseMsg) => {
  //   if (!robotPoseMsg) {
  //     console.log("Waiting for /robot_pose topic...");
  //   }
  //   if (robotPoseMsg) {
  //     setRobotPose({
  //       x: robotPoseMsg.position.x,
  //       y: robotPoseMsg.position.y,
  //       z: robotPoseMsg.position.z,
  //       q_x: robotPoseMsg.orientation.x,
  //       q_y: robotPoseMsg.orientation.y,
  //       q_z: robotPoseMsg.orientation.z,
  //       q_w: robotPoseMsg.orientation.w
  //     });
  //     setRobotPoseCanvas({
  //       x: getCanvasPoseX(robotPoseMsg.position.x),
  //       y: getCanvasPoseY(robotPoseMsg.position.y),
  //       theta: getCanvasOrientation(robotPoseMsg.orientation)
  //     });
  //   }
  // };

  // const laserPoseCallback = (laserPoseMsg) => {
  //   if (!laserPoseMsg) {
  //     console.log("Waiting for /laser_pose topic...");
  //   }
  //   if (laserPoseMsg) {
  //     setLaserPose({
  //       x: laserPoseMsg.position.x,
  //       y: laserPoseMsg.position.y,
  //       z: laserPoseMsg.position.z,
  //       q_x: laserPoseMsg.orientation.x,
  //       q_y: laserPoseMsg.orientation.y,
  //       q_z: laserPoseMsg.orientation.z,
  //       q_w: laserPoseMsg.orientation.w
  //     });
  //     setLaserPoseCanvas({
  //       x: getCanvasPoseX(laserPoseMsg.position.x),
  //       y: getCanvasPoseY(laserPoseMsg.position.y),
  //       theta: getCanvasOrientation(laserPoseMsg.orientation)
  //     });
  //   }
  // };

  // const laserScanCallback = (laserScanMsg) => {
  //   if (!laserScanMsg) {
  //     console.log("Waiting for /scan topic...");
  //   }
  //   if (laserScanMsg) {
  //     var point_scanx = 0;
  //     var point_scany = 0;
  //     var points_skip = 1; //consider only every points_skip points
  //     var n = laserScanMsg.ranges.length;
  //     var points_array = [];
  //     for (var i = 0; i < n; i += points_skip) {
  //       var range = laserScanMsg.ranges[i];
  //       if (range >= laserScanMsg.range_min && range <= laserScanMsg.range_max) {
  //         var angle = laserScanMsg.angle_min + i * laserScanMsg.angle_increment;
  //         point_scanx = getCanvasPoseX(
  //           range *
  //             Math.cos(
  //               angle +
  //                 degrees_to_radians(
  //                   -(laserPoseCanvas.theta + 90) + 180
  //                 )
  //             )
  //         );
  //         point_scany = getCanvasPoseY(
  //           range *
  //             Math.sin(
  //               angle +
  //                 degrees_to_radians(
  //                   -(laserPoseCanvas.theta + 90) + 180
  //                 )
  //             )
  //         );
  //         point_scanx += laserPoseCanvas.x - 10;
  //         point_scany += laserPoseCanvas.y + 10;
  //       }
  //       points_array.push([point_scanx, point_scany]);
  //     }
  //     setLaserScan(points_array);
  //   }
  // };

  // const robotPoseMsg = useSubscription(robotPoseTopic);
  // const laserPoseMsg = useSubscription(laserPoseTopic);
  // const laserScanMsg = useSubscription(laserScanTopic);

  // useEffect(() => {
  //   if (!robotPoseMsg) {
  //     console.log("Waiting for /robot_pose topic...");
  //   }
  //   if (robotPoseMsg) {
  //     setRobotPose({
  //       x: robotPoseMsg.position.x,
  //       y: robotPoseMsg.position.y,
  //       z: robotPoseMsg.position.z,
  //       q_x: robotPoseMsg.orientation.x,
  //       q_y: robotPoseMsg.orientation.y,
  //       q_z: robotPoseMsg.orientation.z,
  //       q_w: robotPoseMsg.orientation.w
  //     });
  //     setRobotPoseCanvas({
  //       x: getCanvasPoseX(robotPoseMsg.position.x),
  //       y: getCanvasPoseY(robotPoseMsg.position.y),
  //       theta: getCanvasOrientation(robotPoseMsg.orientation)
  //     });
  //   }
  // }, [robotPoseMsg]);

  // useEffect(() => {
  //   if (!laserPoseMsg) {
  //     console.log("Waiting for /laser_pose topic...");
  //   }
  //   if (laserPoseMsg) {
  //     setLaserPose({
  //       x: laserPoseMsg.position.x,
  //       y: laserPoseMsg.position.y,
  //       z: laserPoseMsg.position.z,
  //       q_x: laserPoseMsg.orientation.x,
  //       q_y: laserPoseMsg.orientation.y,
  //       q_z: laserPoseMsg.orientation.z,
  //       q_w: laserPoseMsg.orientation.w
  //     });
  //     setLaserPoseCanvas({
  //       x: getCanvasPoseX(laserPoseMsg.position.x),
  //       y: getCanvasPoseY(laserPoseMsg.position.y),
  //       theta: getCanvasOrientation(laserPoseMsg.orientation)
  //     });
  //   }
  // }, [laserPoseMsg]);

  // useEffect(() => {
  //   if (!laserScanMsg) {
  //     console.log("Waiting for /scan topic...");
  //   }
  //   if (laserScanMsg) {
  //     var point_scanx = 0;
  //     var point_scany = 0;
  //     var points_skip = 1; //consider only every points_skip points
  //     var n = laserScanMsg.ranges.length;
  //     var points_array = [];
  //     for (var i = 0; i < n; i += points_skip) {
  //       var range = laserScanMsg.ranges[i];
  //       if (range >= laserScanMsg.range_min && range <= laserScanMsg.range_max) {
  //         var angle = laserScanMsg.angle_min + i * laserScanMsg.angle_increment;
  //         point_scanx = getCanvasPoseX(
  //           range *
  //             Math.cos(
  //               angle +
  //                 degrees_to_radians(
  //                   -(laserPoseCanvas.theta + 90) + 180
  //                 )
  //             )
  //         );
  //         point_scany = getCanvasPoseY(
  //           range *
  //             Math.sin(
  //               angle +
  //                 degrees_to_radians(
  //                   -(laserPoseCanvas.theta + 90) + 180
  //                 )
  //             )
  //         );
  //         point_scanx += laserPoseCanvas.x - 10;
  //         point_scany += laserPoseCanvas.y + 10;
  //       }
  //       points_array.push([point_scanx, point_scany]);
  //     }
  //     setLaserScan(points_array);
  //   }
  // }, [laserScanMsg]);

  useEffect(() => {
    if (mapImage) {
      setMapDimensions({width: mapImage.width, height: mapImage.height});
    }
  }, [mapImage]);

  useEffect(() => {
    const updateStageDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setStageDimensions({
          width: clientWidth,
          height: clientHeight || 600 // Fallback height if clientHeight is 0
        });
      }
    };

    // Initial measurement after a brief delay to ensure rendering
    setTimeout(updateStageDimensions, 0);

    // Set up resize observer
    const resizeObserver = new ResizeObserver(() => {
      // Add a small delay to ensure accurate measurements
      setTimeout(updateStageDimensions, 0);
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Clean up
    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, []);

  const handleWheel = (e) => {
    e.evt.preventDefault();
    const scaleBy = 1.02;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const mousePos = stage.getPointerPosition();

    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    stage.scale({ x: newScale, y: newScale });

    const newPos = {
      x: mousePos.x - (mousePos.x - stage.x()) / oldScale * newScale,
      y: mousePos.y - (mousePos.y - stage.y()) / oldScale * newScale,
    };
    stage.position(newPos);
    setStageScale(newScale);
    setStageX(newPos.x);
    setStageY(newPos.y);
  };

  const handleResetZoom = () => {
    const stage = stageRef.current;
    if (stage) {
      stage.scale({x:1, y: 1});
      stage.position({x: 0, y: 0});
      setStageScale(1);
      setStageX(0);
      setStageY(0);
    }
  };

  const getCanvasPoseX = (poseX) => {
    var canvasX = poseX / mapResolution + 10;
    return canvasX
  };

  const getCanvasPoseY = (poseY) => {
    var canvasY = -poseY / mapResolution - 10;
    return canvasY
  };

  const getCanvasOrientation = (quaternion) => {
    var q = new Three.Quaternion(
      quaternion.x,
      quaternion.y,
      quaternion.z,
      quaternion.w
    );
    // convert this quaternion into roll, pitch and yaw
    var RPY = new Three.Euler().setFromQuaternion(q);
    var yaw = RPY["_z"] * (180 / Math.PI);
    yaw = -(yaw + 90) + 180; // correction for konva rotation 90 deg and inverted orientation
    return yaw;
  };

  const degrees_to_radians = (degrees) => {
    var pi = Math.PI;
    return degrees * (pi / 180);
  };

  const radians_to_degrees = (radians) => {
    var pi = Math.PI;
    return radians * (180 / pi);
  };

  const mapStyles = useColorModeValue(
    "mapbox://styles/simmmple/ckwxecg1wapzp14s9qlus38p0",
    "mapbox://styles/simmmple/cl0qqjr3z000814pq7428ptk5"
  );
  // Chakra color mode
  const brand = useColorModeValue("brand.500", "brand.400");
  const inputBg = useColorModeValue(
    { base: "secondaryGray.300", md: "white" },
    { base: "navy.700", md: "navy.900" }
  );
  const textColorSecondary = useColorModeValue("secondaryGray.700", "white");
  const dash = useColorModeValue("234318FFFF", "237551FFFF");
  return (
      <Card
        justifyContent='center'
        position='relative'
        direction='column'
        w='100%'
        p='20px'
        zIndex='0'
        minH={{ base: "600px", lg: "100%" }}
        {...rest}>
        <Box position="relative" width="100%" height="100%" minHeight="600px">
          {/* Fixed Controls */}
          <Flex
            position="absolute"
            top="20px"
            right="20px"
            direction="column"
            gap="10px"
            zIndex="2"
          >
            <Button
              onClick={handleResetZoom}
              borderRadius='50%'
              ms={{ base: "14px", md: "auto" }}
              bg='white'
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
              bg='white'
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
              onClick={() => {
                !localizeMode ? setLocalizeMode(true) : setLocalizeMode(false);
              }}
              borderRadius='50%'
              ms={{ base: "14px", md: "auto" }}
              bg='white'
              w={{ base: "45px", md: "70px" }}
              h={{ base: "45px", md: "70px" }}
              minW={{ base: "45px", md: "70px" }}
              minH={{ base: "45px", md: "70px" }}
              variant='no-hover'
            >
              <Icon 
              as={MdLocationOn} 
              color='secondaryGray.700'
              w={{ base: "18px", md: "25px" }}
              h={{ base: "18px", md: "25px" }}
              />
            </Button>
            <Button
              onClick={() => {}}
              borderRadius='50%'
              ms={{ base: "14px", md: "auto" }}
              bg='white'
              w={{ base: "45px", md: "70px" }}
              h={{ base: "45px", md: "70px" }}
              minW={{ base: "45px", md: "70px" }}
              minH={{ base: "45px", md: "70px" }}
              variant='no-hover'
            >
              <Icon 
              as={IoPaperPlane} 
              color='secondaryGray.700'
              w={{ base: "18px", md: "25px" }}
              h={{ base: "18px", md: "25px" }}
              />
            </Button>
          </Flex>

          {/* Fixed Info Card */}
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
              {/* <Flex
                position='relative'
                bg={inputBg}
                w={{ base: "calc( 100% - 50px )", md: "max-content" }}
                borderRadius='20px'
                p={{ base: "30px", md: "30px" }}
                mt='auto'>
                <Flex
                  position='absolute'
                  zIndex={1.1}
                  h='calc(100% - 60px)'
                  w='2px'
                  left='36.5px'
                  bgImage={`url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' stroke='%${dash}' stroke-width='4' stroke-dasharray='6%2c 14' stroke-dashoffset='5' stroke-linecap='square'/%3e%3c/svg%3e");`}
                />
                <Flex w='100%' direction='column' me={{ base: "20px", md: "40px" }}>
                  <Flex
                    mb='50px'
                    w={{ base: "100%", md: "100%" }}
                    h='max-content'
                    zIndex='2'>
                    <Box
                      me='14px'
                      border='3px solid'
                      borderColor={brand}
                      bg={inputBg}
                      h='16px'
                      w='16px'
                      borderRadius='50%'
                    />
                    <Text
                      w='max-content'
                      color={textColorSecondary}
                      fontSize='md'
                      fontWeight='500'>
                      Your location
                    </Text>
                  </Flex>
                  <Flex w='100%' h='max-content' zIndex='2' ms='-4px' bg={inputBg}>
                    <Icon
                      color={brand}
                      as={MdLocationOn}
                      me='10px'
                      w='24px'
                      h='24px'
                    />
                    <Text
                      minW='max-content'
                      color={textColorSecondary}
                      fontSize='md'
                      fontWeight='500'>
                      W. Street 253
                    </Text>
                  </Flex>
                </Flex>
                <Flex direction='column'>
                  <Flex
                    mb='16px'
                    w='100%'
                    direction='column'
                    h='max-content'
                    zIndex='2'>
                    <Text
                      w='max-content'
                      color={textColorSecondary}
                      fontSize='sm'
                      fontWeight='500'>
                      Distance
                    </Text>
                    <Text
                      w='max-content'
                      color={textColorSecondary}
                      fontSize='lg'
                      lineHeight='100%'
                      fontWeight='500'>
                      34 km
                    </Text>
                  </Flex>
                  <Flex
                    w='100%'
                    direction='column'
                    h='max-content'
                    zIndex='2'
                    ms='-4px'>
                    <Text
                      w='max-content'
                      color={textColorSecondary}
                      fontSize='sm'
                      fontWeight='500'>
                      Time
                    </Text>
                    <Text
                      w='max-content'
                      color={textColorSecondary}
                      fontSize='lg'
                      lineHeight='100%'
                      fontWeight='500'>
                      20 min
                    </Text>
                  </Flex>
                </Flex>
              </Flex> */}
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
                    X: {robotPoseCanvas.x.toFixed(2)}, Y: {robotPoseCanvas.y.toFixed(2)}
                  </Text>
                </Flex>
                <Flex justify="space-between">
                  <Text color={textColorSecondary}>laserPose: </Text>
                  <Text fontWeight="medium">
                    X: {laserPoseCanvas.x.toFixed(2)}, Y: {laserPoseCanvas.y.toFixed(2)}
                  </Text>
                </Flex>
                <Flex justify="space-between">
                  <Text color={textColorSecondary}>Orientation: </Text>
                  <Text fontWeight="medium">
                    {robotPoseCanvas.theta.toFixed(0)}˚  
                  </Text>
                </Flex>
              </Flex>
            </Box>
          )}

          {/* Canvas Container */}
          <div 
            ref={containerRef}
            style={{ 
              width: '100%', 
              height: '100%',
              minHeight: '600px' // Match Card's minHeight
            }}
          >
            <Stage
              ref={stageRef}
              width={stageDimensions.width}
              height={stageDimensions.height}
              scaleX={stageScale}
              scaleY={stageScale}
              x={stageX}
              y={stageY}
              offsetX={-stageDimensions.width / 2}
              offsetY={-stageDimensions.height / 2}
              draggable
              onWheel={handleWheel}
              style={{ 
                backgroundColor: "#cdcdcd",
                borderRadius: '15px', 
                overflow: 'hidden'
              }}
            >
              <Layer>
                <Image
                  image={mapImage}
                  x={0}
                  y={0}
                  scaleX={1.0}
                  scaleY={1.0}
                  offsetX={mapDimensions.width/2}
                  offsetY={mapDimensions.height/2}
                />
                <Group
                  draggable={localizeMode}
                >
                  <Circle
                      x={robotPoseCanvas.x}
                      y={robotPoseCanvas.y}
                      width={100}
                      height={100}
                      fill={
                        localizeMode ? "#bcc1c480" : "#00000000"
                      }
                      stroke={
                        localizeMode ? "#bcc1c480" : "#00000000"
                      }
                      strokeWidth={0.0}
                    />
                  <Shape
                    sceneFunc={(context, shape) => {
                      context.beginPath();
                      context.moveTo(0, 0);
                      context.lineTo(10, 10);
                      context.lineTo(0, -20);
                      context.lineTo(-10, 10);
                      context.closePath();
                      // (!) Konva specific method, it is very important
                      context.fillStrokeShape(shape);
                    }}
                    scaleX={0.5}
                    scaleY={0.5}
                    x={robotPoseCanvas.x}
                    y={robotPoseCanvas.y}
                    rotation={robotPoseCanvas.theta}
                    fill="red"
                    stroke="black"
                    strokeWidth={2.5}
                  />
                  {laserScan.map((point) => (
                    <Circle
                      x={point[0]}
                      y={point[1]}
                      width={2.25}
                      height={2.25}
                      fill={localizeMode ? "blue" : "red"}
                      stroke={localizeMode ? "blue" : "red"}
                      strokeWidth={0.0}
                    />
                  ))}
                </Group>
              </Layer>
            </Stage>
          </div>
        </Box>
      </Card>
  );
};

export default MapCard
