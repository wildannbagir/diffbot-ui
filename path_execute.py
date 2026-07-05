#!/usr/bin/env python3
import rospy
import os
import sys
import yaml
import math
import actionlib
from actionlib_msgs.msg import *
from geometry_msgs.msg import Pose, PoseStamped, Point, Quaternion, Twist
from move_base_msgs.msg import MoveBaseAction, MoveBaseGoal, MoveBaseFeedback
from std_srvs.srv import Empty, EmptyResponse
from dynamic_reconfigure.client import Client
from path_execute.srv import RunPath, RunPathResponse

path_execute_version = "0.1.0"

class PathExecute:
    def __init__(self):
        self.persistence = rospy.get_param('~persistence', 0)  # Default persistence is 0 (abort)
        self.xy_goal_tolerance = rospy.get_param('/move_base/TebLocalPlannerROS/xy_goal_tolerance', 0.2)
        self.yaw_goal_tolerance = rospy.get_param('/move_base/TebLocalPlannerROS/yaw_goal_tolerance', 0.2)
        self.xy_goal_tolerance_tight = 0.2
        self.yaw_goal_tolerance_tight = 0.2
        self.xy_goal_tolerance_loose = 0.2
        self.yaw_goal_tolerance_loose = 0.2
        self.current_pose = Pose()
        self.is_executing = False
  
        # Initialize the action client for move_base
        self.mb_client = actionlib.SimpleActionClient("move_base", MoveBaseAction)
        rospy.loginfo("Waiting for move_base action server...")
        self.mb_client.wait_for_server(rospy.Duration(60))
        rospy.loginfo("Connected to move_base action server!")

        # Subscribe to the /robot_pose topic
        rospy.Subscriber('/robot_pose', Pose, self.robot_pose_callback)

        # Initialize dynamic reconfigure client
        self.dyn_client = Client("/move_base/TebLocalPlannerROS", timeout=30)

        # Register the service to cancel the path
        self.cancel_service = rospy.Service('/cancel_path', Empty, self.cancel_path)
        
        # Register the service to run a path
        self.run_path_service = rospy.Service('/run_path', RunPath, self.handle_run_path)
        
        # Register shutdown hook
        rospy.on_shutdown(self.on_shutdown)
        self.rate = rospy.Rate(5) # 5 Hz

        rospy.loginfo("Path execute service ready!")

    def load_path(self, path_name):
        path_directory = '~/catkin_ws/src/ugv/paths/'
        path_file_full = os.path.expanduser(f"{path_directory}{path_name}.yaml")
        try:
            with open(path_file_full, 'r') as file:
                path_data = yaml.safe_load(file)
            return path_data['waypoints']
        except Exception as e:
            rospy.logerr(f"Error loading path file: {e}")
            return None
    
    def robot_pose_callback(self, msg):
        self.current_pose = msg

    def check_tolerance(self, waypoint, distance_tolerance=1.2, yaw_tolerance=2.0):
        current_position = self.current_pose.position
        current_orientation = self.current_pose.orientation

        target_position = waypoint['position']
        target_orientation = waypoint['orientation']

        # Calculate distance
        distance = math.sqrt(
            (current_position.x - target_position['x']) ** 2 +
            (current_position.y - target_position['y']) ** 2
        )

        # Calculate yaw difference
        current_yaw = math.atan2(2.0 * (current_orientation.w * current_orientation.z + current_orientation.x * current_orientation.y),
                                1.0 - 2.0 * (current_orientation.y * current_orientation.y + current_orientation.z * current_orientation.z))
        target_yaw = math.atan2(2.0 * (target_orientation['w'] * target_orientation['z'] + target_orientation['x'] * target_orientation['y']),
                                1.0 - 2.0 * (target_orientation['y'] * target_orientation['y'] + target_orientation['z'] * target_orientation['z']))

        yaw_difference = abs(current_yaw - target_yaw)

        return distance <= distance_tolerance #and yaw_difference <= yaw_tolerance

    def send_goal(self, waypoint):
        goal = MoveBaseGoal()
        goal.target_pose.header.frame_id = "map"
        goal.target_pose.header.stamp = rospy.Time.now()
        goal.target_pose.pose.position.x = waypoint['position']['x']
        goal.target_pose.pose.position.y = waypoint['position']['y']
        goal.target_pose.pose.position.z = waypoint['position']['z']
        goal.target_pose.pose.orientation.x = waypoint['orientation']['x']
        goal.target_pose.pose.orientation.y = waypoint['orientation']['y']
        goal.target_pose.pose.orientation.z = waypoint['orientation']['z']
        goal.target_pose.pose.orientation.w = waypoint['orientation']['w']
        rospy.loginfo("Sending goal to waypoint: %d", waypoint['id'])
        self.mb_client.send_goal(goal)
        if self.current_waypoint != 0:
            while not rospy.is_shutdown() and self.is_executing:
                if self.check_tolerance(waypoint):
                    rospy.loginfo("Goal reached successfully within tolerance.")
                    return
                self.rate.sleep()
        self.mb_client.wait_for_result()
        result = self.mb_client.get_state()
        if result == GoalStatus.SUCCEEDED:
            rospy.loginfo("Goal reached successfully.")
        else:
            rospy.loginfo("Goal failed to reach.")
            if self.persistence == 0:
                rospy.loginfo("Aborting path execution.")
                self.is_executing = False
            elif self.persistence == 1:
                rospy.loginfo("Skipping to next waypoint.")
            elif self.persistence == 2:
                rospy.loginfo("Retrying 3 times.")
                for i in range(3):
                    if not self.is_executing:
                        break
                    self.mb_client.send_goal(goal)
                    self.mb_client.wait_for_result()
                    result = self.mb_client.get_state()
                    if result == GoalStatus.SUCCEEDED:
                        rospy.loginfo("Goal reached successfully.")
                        break
                    else:
                        rospy.loginfo("Goal failed to reach.")
            elif self.persistence == 3:
                rospy.loginfo("Retrying indefinitely.")
                while self.is_executing:
                    self.mb_client.send_goal(goal)
                    self.mb_client.wait_for_result()
                    result = self.mb_client.get_state()
                    if result == GoalStatus.SUCCEEDED:
                        rospy.loginfo("Goal reached successfully.")
                        break
                    else:
                        rospy.loginfo("Goal failed to reach.")
        rospy.sleep(1)
    
    def set_path_tolerance(self):
        if self.current_waypoint == 0 or self.current_waypoint == self.total_waypoints-1:
            self.dyn_client.update_configuration({
                'xy_goal_tolerance': self.xy_goal_tolerance_tight,
                'yaw_goal_tolerance': self.yaw_goal_tolerance_tight
            })
        else:
            self.dyn_client.update_configuration({
                'xy_goal_tolerance': self.xy_goal_tolerance_loose,
                'yaw_goal_tolerance': self.yaw_goal_tolerance_loose
            })

    def execute_path(self, path_name):
        self.path_name = path_name
        self.waypoints = self.load_path(path_name)
        if not self.waypoints:
            return False, "Failed to load path file"
        
        self.current_waypoint = 0
        self.total_waypoints = len(self.waypoints)
        self.is_executing = True
        rospy.loginfo(f"Starting path execution with {self.total_waypoints} waypoints")

        while not rospy.is_shutdown() and self.is_executing and self.current_waypoint < self.total_waypoints:
            self.set_path_tolerance()
            self.send_goal(self.waypoints[self.current_waypoint])
            if not self.is_executing:
                break
            self.current_waypoint += 1

        if self.current_waypoint >= self.total_waypoints:
            rospy.loginfo("Path execution completed successfully.")
            return True, "Path execution completed successfully"
        else:
            rospy.loginfo("Path execution interrupted or failed.")
            return False, "Path execution interrupted or failed"
    
    def handle_run_path(self, req):
        if self.is_executing:
            return RunPathResponse(False, "Path is already being executed")
        
        # Start path execution in a separate thread
        import threading
        thread = threading.Thread(target=self.execute_path, args=(req.path_name,))
        thread.start()
        
        return RunPathResponse(True, "Path execution started")
    
    def cancel_path(self, req):
        rospy.loginfo("Cancelling path execution.")
        self.is_executing = False
        self.mb_client.cancel_all_goals()
        return EmptyResponse()
    
    def on_shutdown(self):
        rospy.loginfo("Shutting down. Cancelling all goals and stopping the robot.")
        self.is_executing = False
        self.mb_client.cancel_all_goals()
        rospy.signal_shutdown("Path execution shutdown.")


if __name__ == "__main__":
    try:
        rospy.init_node('path_execute')
        PathExecute()
        rospy.spin()
    except rospy.ROSInterruptException:
        rospy.loginfo("Path execution interrupted.") 