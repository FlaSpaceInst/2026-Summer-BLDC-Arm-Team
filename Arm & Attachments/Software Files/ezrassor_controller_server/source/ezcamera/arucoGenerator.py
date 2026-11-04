# Class for controlling video feed and computer vision software on EZ-RASSOR
# 2023 & 2024 Noah Gregory for Florida Space Institute

import numpy as np
import argparse
import cv2
import sys

# ArUco marker dictionary to generate markers from
MARKER_DICTIONARY = "DICT_5X5_100"

# Directory to store ArUco markers aka "tags" in
MARKER_DIR = 'tags/'

# dictionaries of ArUco markers
# Each marker dictionary is defined by: cv2.aruco.DICT_NXN_M
# NXN represents the dimensions in bits of the marker image
# M represents how many unique markers can be made from that dictionary
ARUCO_DICT = {
    "DICT_4X4_50": cv2.aruco.DICT_4X4_50,
    "DICT_4X4_100": cv2.aruco.DICT_4X4_100,
    "DICT_4X4_250": cv2.aruco.DICT_4X4_250,
    "DICT_4X4_1000": cv2.aruco.DICT_4X4_1000,
    "DICT_5X5_50": cv2.aruco.DICT_5X5_50,
    "DICT_5X5_100": cv2.aruco.DICT_5X5_100,
    "DICT_5X5_250": cv2.aruco.DICT_5X5_250,
    "DICT_5X5_1000": cv2.aruco.DICT_5X5_1000,
    "DICT_6X6_50": cv2.aruco.DICT_6X6_50,
    "DICT_6X6_100": cv2.aruco.DICT_6X6_100,
    "DICT_6X6_250": cv2.aruco.DICT_6X6_250,
    "DICT_6X6_1000": cv2.aruco.DICT_6X6_1000,
    "DICT_7X7_50": cv2.aruco.DICT_7X7_50,
    "DICT_7X7_100": cv2.aruco.DICT_7X7_100,
    "DICT_7X7_250": cv2.aruco.DICT_7X7_250,
    "DICT_7X7_1000": cv2.aruco.DICT_7X7_1000,
    "DICT_ARUCO_ORIGINAL": cv2.aruco.DICT_ARUCO_ORIGINAL,
    "DICT_APRILTAG_16h5": cv2.aruco.DICT_APRILTAG_16h5,
    "DICT_APRILTAG_25h9": cv2.aruco.DICT_APRILTAG_25h9,
    "DICT_APRILTAG_36h10": cv2.aruco.DICT_APRILTAG_36h10,
    "DICT_APRILTAG_36h11": cv2.aruco.DICT_APRILTAG_36h11
}


# parse arguments from command line to use for creating a specific marker
def get_cmd_arguments():
    arg_parser = argparse.ArgumentParser()
    arg_parser.add_argument("-o", "--output", required=True,
                            help="path to output image containing ArUco tag")
    arg_parser.add_argument("-i", "--id", type=int, required=True,
                            help="ID of ArUco tag to generate")
    arg_parser.add_argument("-t", "--type", type=str,
                            default="DICT_ARUCO_ORIGINAL",
                            help="type of ArUco tag to generate")

    # return parsed command line arguments in a dictionary
    return vars(arg_parser.parse_args())


# check that the given ArUCo tag is exists and is a valid tag for use with OpenCV
def check_inputs(args):
    if ARUCO_DICT.get(args["type"], None) is None:
        print("[INFO] ArUCo tag of '{}' is not valid".format(args["type"]))
        sys.exit(0)


# get the ArUCo marker dictionary
def get_aruco_dictionary(inputs):
    return cv2.aruco.getPredefinedDictionary(ARUCO_DICT[inputs["type"]])


# allocate memory for the output ArUCo tag and save locally
def draw_and_save_marker(args, aruco_dict):
    print("[INFO] generating ArUCo tag type '{}' with ID '{}'".format(
        args["type"], args["id"]))
    tag = np.zeros((300, 300, 1), dtype="uint8")

    # draw the ArUCo tag on the output image based on chosen ID, side pixels set to 300, and boarder bits set to 1
    cv2.aruco.generateImageMarker(aruco_dict, args["id"], 300, tag, 1)

    # save generated marker locally and return tag
    cv2.imwrite(args["output"], tag)
    return tag


# show marker to user on screen
def show_marker_to_screen(tag):
    cv2.imshow("ArUCo Tag", tag)
    cv2.waitKey(0)


# create marker based on user inputs from command line
def create_marker_cmd_input():
    args_dict = get_cmd_arguments()
    check_inputs(args_dict)
    aruco_dict = get_aruco_dictionary(args_dict)
    draw_and_save_marker(args_dict, aruco_dict)


# create marker based on inputs provided as three variables
def create_marker_vars_input(marker_id, marker_type, output_dir):
    # create dictionary with input values
    inputs_dict = {"id": marker_id, "type": marker_type, "output": output_dir}

    check_inputs(inputs_dict)
    aruco_dict = get_aruco_dictionary(inputs_dict)
    draw_and_save_marker(inputs_dict, aruco_dict)


if __name__ == '__main__':
    create_marker_cmd_input()

# for debugging
# marker_id = 8
# marker_file_name = MARKER_DIR + MARKER_DICTIONARY + "_id" + str(marker_id) + ".png"
# print(marker_file_name)
# create_marker_vars_input(marker_id, MARKER_DICTIONARY, marker_file_name)
