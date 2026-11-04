"""Launch a controller_server node."""
from launch import LaunchDescription
from launch_ros.actions import Node


def generate_launch_description():
    """Create a controller_server node with a launch description."""
    controller_server_node = Node(
        package="ezrassor_controller_server",
        executable="controller_server",
        output={"both": "screen"},
    )

    return LaunchDescription([controller_server_node])
