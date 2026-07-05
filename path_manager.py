#!/usr/bin/env python3
import rospy
import os
import yaml
from path_execute.srv import ListPaths, ListPathsResponse, GetPath, GetPathResponse, DeletePath, DeletePathResponse
from geometry_msgs.msg import Pose, Point, Quaternion

class PathManager:
    def __init__(self):
        self.path_directory = os.path.expanduser('~/catkin_ws/src/ugv/paths/')
        
        # Create services
        self.list_service = rospy.Service('list_paths', ListPaths, self.handle_list_paths)
        self.get_service = rospy.Service('get_path', GetPath, self.handle_get_path)
        self.delete_service = rospy.Service('delete_path', DeletePath, self.handle_delete_path)
        
        rospy.loginfo("Path manager services ready")

    def handle_list_paths(self, req):
        try:
            paths = []
            for file in os.listdir(self.path_directory):
                if file.endswith('.yaml'):
                    path_name = file[:-5]  # Remove .yaml extension
                    # If filter is provided, only include paths that match the filter
                    if req.filter and req.filter not in path_name:
                        continue
                    paths.append(path_name)
            return ListPathsResponse(success=True, paths=paths)
        except Exception as e:
            return ListPathsResponse(success=False, message=str(e))

    def handle_get_path(self, req):
        try:
            file_path = os.path.join(self.path_directory, f"{req.path_name}.yaml")
            with open(file_path, 'r') as f:
                path_data = yaml.safe_load(f)
            
            # Convert YAML waypoints to ROS Pose messages
            waypoints = []
            for wp in path_data.get('waypoints', []):
                pose = Pose()
                pose.position = Point(
                    x=float(wp['position']['x']),
                    y=float(wp['position']['y']),
                    z=float(wp['position']['z'])
                )
                pose.orientation = Quaternion(
                    x=float(wp['orientation']['x']),
                    y=float(wp['orientation']['y']),
                    z=float(wp['orientation']['z']),
                    w=float(wp['orientation']['w'])
                )
                waypoints.append(pose)
            
            return GetPathResponse(success=True, waypoints=waypoints)
        except Exception as e:
            rospy.logerr(f"Error getting path: {str(e)}")
            return GetPathResponse(success=False, message=str(e))

    def handle_delete_path(self, req):
        try:
            file_path = os.path.join(self.path_directory, f"{req.path_name}.yaml")
            os.remove(file_path)
            return DeletePathResponse(success=True, message="Path deleted successfully")
        except Exception as e:
            return DeletePathResponse(success=False, message=str(e))

if __name__ == '__main__':
    rospy.init_node('path_manager')
    PathManager()
    rospy.spin() 