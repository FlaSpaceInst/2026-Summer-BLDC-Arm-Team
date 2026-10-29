
# RE-RASSOR Arm Development

## Overview

The 2026 RE-RASSOR Arm Development Team is responsible for designing, prototyping, and integrating a modular robotic arm with the existing RE-RASSOR rover platform. The project builds upon previous RE-RASSOR Senior Design efforts while introducing new mechanical, software, and systems engineering capabilities focused on robotic manipulation.

The project has progressed beyond the preliminary design phase and is currently in the implementation, integration, and validation stage. The team has established the arm's primary mechanical architecture, developed and iterated multiple CAD prototypes, integrated inherited rover hardware and software resources, and continued development of the arm control interface and communication architecture.

The arm architecture is designed around four degrees of freedom: a rotating base, shoulder joint, elbow joint, and end effector. The primary arm joints currently demonstrate movement, but the end effector is not yet complete. Motor-selection and weight constraints remain unresolved for the end effector. The arm uses a hybrid actuation approach, and the BLDC motor platform builds upon work completed by the 2025 UCF BLDC Motor Control Team.

Development is being performed iteratively through CAD modeling, additive manufacturing, assembly, subsystem evaluation, software development, and integration. Prototype revisions have been used to identify dimensional, structural, clearance, manufacturing, and assembly issues before progressing toward later versions.

In addition to developing the robotic arm, the project emphasizes documentation, maintainability, and knowledge transfer so future RE-RASSOR teams can continue development using the work produced during the 2026 project cycle.

---

## Project Background

The RE-RASSOR platform is a long-term educational and engineering project maintained through the Florida Space Institute (FSI) and supported by multiple University of Central Florida (UCF) Senior Design teams. The platform has undergone several iterations over multiple years, with each team contributing new capabilities, hardware improvements, software features, and documentation.

The 2026 RE-RASSOR Arm Development Team inherited an existing rover platform, control architecture, electrical systems, software resources, BLDC motor research, and previous design documentation. The current project therefore requires both new development and integration with systems that were not originally created by the 2026 team.

This repository serves as the development repository for the 2026 RE-RASSOR Arm Development Team and contains both inherited project resources and new development work completed during the Summer and Fall 2026 semesters.

---

## Acknowledgements and Prior Work

This project builds upon significant work completed by previous RE-RASSOR teams.

### 2023 RE-RASSOR Extension Team

The rover platform, base cart systems, software architecture, ROS integration, networking components, and core rover functionality contained within the **Base Cart & Control** directory originate primarily from the 2023 RE-RASSOR Extension Team.

Original repository:

https://github.com/FlaSpaceInst/2023-RE-RASSOR-Extension/tree/cart_desktop

The 2026 team did not develop the original rover platform and does not claim authorship of the inherited rover software, control systems, or base vehicle design.

### 2025 UCF BLDC Motor Control Team

The Brushless DC (BLDC) motor research, control systems, CAD resources, motor testing, and supporting documentation contained within the **BLDC CAD** directory originate from the 2025 UCF BLDC Motor Control Senior Design Team.

Original repository:

https://github.com/FlaSpaceInst/2025-Fall-UCF-BLDC-Motor-Control

The 2026 team utilizes this work as a technical reference and foundation for arm actuation development. The 2025 BLDC system was developed primarily for the rover wheel system; the 2026 project is extending its use to the robotic arm and evaluating its behavior under the different loading conditions associated with arm actuation.

The 2026 team does not claim authorship of the original BLDC motor project.

### 2026 RE-RASSOR Arm Development Team

The 2026 Senior Design Team is responsible for:

- Robotic arm design and development
- Arm integration with the existing rover platform
- New CAD models and prototype components
- Arm-related software modifications
- Arm control and user-interface development
- Testing and validation activities
- Documentation generated during the 2026 project cycle
- Future arm control functionality and user interface integration
- Integration of applicable inherited systems into the arm architecture

Unless otherwise noted, materials located within the **Arm & Attachments** and **Documentation & Testing** directories are the work of the 2026 RE-RASSOR Arm Development Team.

---

## Objectives

The primary objectives of this project are:

- Design and develop a robotic arm capable of manipulating the project's standardized 3D-printed pavers.
- Integrate arm controls with the existing RE-RASSOR control architecture.
- Utilize a hybrid stepper/BLDC actuation system appropriate for the arm's mechanical requirements.
- Prototype, evaluate, and iteratively improve the arm's mechanical components.
- Maintain compatibility with existing rover mechanical, electrical, and software systems.
- Develop an operator interface appropriate for multi-joint arm control.
- Establish testing procedures for mechanical, software, electrical, and integrated system evaluation.
- Maintain clear and reproducible project documentation.
- Produce deliverables that can be continued and expanded by future RE-RASSOR teams.

---

## Repository Organization

The repository is organized to distinguish inherited rover resources, reference material from the previous BLDC team, and original 2026 arm development. The main folders are intended to support both final project delivery and future-team handoff.

### Base Cart & Control

Contains inherited rover resources originating primarily from previous RE-RASSOR teams, including rover software, control architecture, networking resources, and base-platform documentation. These files provide the existing rover foundation that the arm software must remain compatible with.

Primary source: https://github.com/FlaSpaceInst/2023-RE-RASSOR-Extension/tree/cart_desktop/ezrassor_rover/ros-scripts

### BLDC CAD

Contains reference material from the 2025 UCF BLDC Motor Control Team, including motor-control research, CAD resources, testing documentation, and related design files. This work is referenced and adapted where applicable; it is not claimed as original 2026 team work.

Primary source: https://github.com/FlaSpaceInst/2025-Fall-UCF-BLDC-Motor-Control

### Arm & Attachments

Contains the 2026 team's arm-specific mechanical and software development.

#### CAD Files

- **Assembly Schemas/** — assembly and layout references used to understand component relationships and assembly order.
- **STL & Dev Files/** — STL exports and development CAD files, including DWG/Fusion files where available, individual components, assembly models, and earlier design iterations. The `V1 Hand Designs/` and related subfolders preserve earlier end-effector concepts; these are retained for design history and should not automatically be treated as the current final design.
- **G-code & Printing Files/** — manufacturing/slicer project files organized by material and component group:
  - **PETG Final Product Files/** — print projects intended for the final or installed component set, including arm/base and end-effector components.
  - **PLA Files/** — print projects used for prototyping and iteration, including arm/base and end-effector components.

Use the most recent approved CAD/print files for fabrication. STL files are mesh exports and may not preserve the full editability of the original CAD source. Review assembly and print settings before manufacturing.

#### Software Files

- **ezrassor_controller/** — React Native / Expo operator application. Includes the arm controller screen, arm command service and enumerations, styles, and the existing rover controller screens and supporting components.
- **arm_command_bridge/** — Node.js command bridge that maps incoming arm commands to serial communication with the microcontroller.
- **arduino_arm/** — Arduino firmware and supporting source for arm joint actuation, including the stepper-driver implementation.
- **arduino_hand/** — Arduino firmware and supporting source for end-effector actuation and BLDC/FOC control.
- **arduino_wheels/** — wheel-control firmware included alongside the arm integration resources.
- **ezrassor_controller_server/** — inherited/related ROS 2 controller server package, including launch, source, and test resources used by the rover control architecture.
- **Item Identify Alg/** — computer-vision and object-identification experiments. Treat these as supporting/experimental resources unless separately validated as part of the demonstrated baseline.
- **endEffector.js** and **rassor_driver_total_subscriber.py** — additional end-effector and rover integration scripts.
- **.vscode/** — development-environment configuration.

The software folders contain multiple cooperating layers. The operator app, command bridge, microcontroller firmware, and existing rover/ROS 2 services do not all perform the same role. When troubleshooting, trace a command from the user interface through the network/bridge layer to the serial or microcontroller handler rather than assuming a UI change alone changes motor behavior.

### Documentation & Testing

Contains project documentation and evidence generated during development, including design reports, requirements and trade studies, assembly and manufacturing notes, test procedures, validation results, sponsor deliverables, design revisions, known limitations, and handoff material. Keep records of both successful and unsuccessful tests so future teams can understand the reasoning behind final design decisions.

---

## Current Development Status

**Project stage: final refinement and subsystem integration.** The arm’s primary mechanical architecture has been established, and the assembled arm currently demonstrates joint movement. However, the end effector remains incomplete due to motor-selection and weight-related complications. Resolving these constraints is necessary before the end effector can be finalized and the complete arm assembly can undergo integrated validation.

### What is working / established

- The primary four-degree-of-freedom arm architecture has been established.
- The assembled arm currently demonstrates movement through its existing control setup.
- Arm-specific CAD, manufacturing files, firmware, command-bridge resources, and operator-interface components have been developed.
- Previous design iterations and manufacturing resources are retained to support refinement and future development.

### Remaining development priorities

- **End-effector motor selection and integration:** Resolve motor-related weight constraints and determine a suitable configuration for the end effector. Complete mechanical and electrical integration once the motor configuration is finalized.
- **Mechanical refinement:** Address remaining fit, clearance, mounting, alignment, and manufacturing issues identified during assembly and testing.
- **Control interface refinement:** Coordinate the operator interface with the backend and firmware, including implementation of adjustable speed controls and their associated command mappings.
- **Command-path validation:** Verify communication from the operator application through the command bridge to the appropriate microcontroller and motor-control subsystem.
- **Integrated testing:** Test the completed arm and end effector together after the remaining hardware and software work is finished.
- **Documentation and handoff:** Record assembly instructions, verified functionality, test results, known limitations, and setup requirements for future teams.

### Current limitations

Although the arm’s primary joints demonstrate movement, the project has not yet reached full end-to-end mechanical integration because the end effector is unfinished. Successful movement of the arm joints does not establish that the gripper is functional or that the complete system has passed integrated testing.

Computer-vision-assisted identification, ArUco tracking, autonomous or semi-autonomous paver retrieval, and other planned capabilities should remain classified as experimental or future work unless separately demonstrated.

The remaining development effort is focused on resolving the end-effector motor and weight constraints, completing integration, making targeted refinements, and validating the assembled system. Update this section as final tests confirm additional capabilities or reveal remaining issues.

---

## License and Attribution

This repository contains a combination of inherited work from previous RE-RASSOR teams and original work created by the 2026 RE-RASSOR Arm Development Team.

Where possible, original sources have been referenced and credited. Users should review the source repositories and any associated licensing information before redistributing inherited materials.

Additional external design references used during development are documented in the project design documentation, including their applicable attribution and licensing requirements.

For questions regarding ownership or attribution of specific resources, consult the original repositories and source documentation referenced by this project.
