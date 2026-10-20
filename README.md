# RE-RASSOR Arm Development

## Overview

The 2026 RE-RASSOR Arm Development Team is responsible for designing, prototyping, and integrating a modular robotic arm with the existing RE-RASSOR rover platform. The project builds upon previous RE-RASSOR Senior Design efforts while introducing new mechanical, software, and systems engineering capabilities focused on robotic manipulation.

The project has progressed beyond the preliminary design phase and is currently in the implementation, integration, and validation stage. The team has established the arm's primary mechanical architecture, developed and iterated multiple CAD prototypes, integrated inherited rover hardware and software resources, and continued development of the arm control interface and communication architecture.

The current arm design uses a four-degree-of-freedom configuration consisting of a rotating base, shoulder joint, elbow joint, and actuated end effector. The design uses a hybrid actuation approach incorporating a stepper motor for the arm base and BLDC motors for the upper arm joints. The BLDC motor platform builds upon work completed by the 2025 UCF BLDC Motor Control Team and is being evaluated for the different loading conditions introduced by the robotic arm.

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

This repository contains inherited project resources as well as new development work produced during the 2026 project cycle.

### Base Cart & Control

Contains inherited rover resources originating primarily from previous RE-RASSOR teams, including:

- Rover software
- Control architecture
- Existing rover documentation
- Networking resources
- Base platform reference materials

Primary source:

https://github.com/FlaSpaceInst/2023-RE-RASSOR-Extension/tree/cart_desktop/ezrassor_rover/ros-scripts

### BLDC CAD

Contains inherited resources from the 2025 BLDC Motor Control Team, including:

- BLDC motor documentation
- Motor control research
- CAD resources
- Testing documentation
- Related design files

Primary source:

https://github.com/FlaSpaceInst/2025-Fall-UCF-BLDC-Motor-Control

### Arm & Attachments

Contains original development work produced by the 2026 RE-RASSOR Arm Development Team, including mechanical design, prototype development, manufacturing resources, and supporting documentation for the robotic arm.

#### CAD Files

Contains CAD resources developed throughout the project lifecycle.

**End Effector Designs**
- Gripper concepts
- End effector assemblies
- Attachment mechanisms
- Supporting design iterations

**STL & Development Files**
- Native CAD models
- Assembly files
- Prototype development resources
- Editable design files

**G-code & Printing Files**
- Printable STL exports
- Slicer projects
- G-code generated for prototype fabrication
- Manufacturing resources

### Documentation & Testing

Contains documentation produced throughout the project lifecycle, including:

- Design reports
- Design requirements and trade studies
- Testing procedures
- Validation results
- Meeting notes where applicable
- Research summaries
- Sponsor deliverables
- Development and integration documentation
- Records of design revisions and identified limitations

---

## Current Development Status

The project has progressed from preliminary design into active implementation and integration.

The primary mechanical architecture has been established as a four-degree-of-freedom robotic arm consisting of a rotating base, shoulder joint, elbow joint, and actuated end effector. Multiple prototype components have been modeled and fabricated through iterative CAD and additive-manufacturing processes. Prototype evaluation has identified and informed revisions involving dimensional accuracy, mounting interfaces, clearance, alignment, structural geometry, and manufacturability.

The arm's mounting system and base components have undergone multiple design iterations. The end effector has also undergone significant redesign following issues encountered during early prototype fabrication and assembly. These iterations are being retained as part of the project's engineering record to document both successful and unsuccessful design approaches.

Software development is progressing alongside the mechanical implementation. The team is extending the existing rover HTTP, ROS2, serial communication, and microcontroller architecture to support arm-specific commands while preserving existing rover functionality. Development of the arm user interface is also underway, including joint-level controls, arm visualization, camera integration concepts, and safety-oriented interaction mechanisms.

Current development efforts are focused on:

- Refining and fabricating mechanical prototype components
- Integrating the arm mounting system with the rover
- Evaluating the inherited BLDC motor platform under arm-specific loading conditions
- Completing arm communication and control pathways
- Developing and refining the robotic arm user interface
- Establishing reliable subsystem interfaces
- Performing mechanical, software, and integrated testing
- Documenting prototype failures, design revisions, and testing results
- Preparing the system for final validation

Some planned capabilities, including computer-vision-assisted target identification, ArUco-based target tracking, autonomous or semi-autonomous paver retrieval, interchangeable end effectors, and additional arm functionality remain future development priorities rather than completed baseline capabilities.

The remaining development effort will focus on subsystem integration, iterative testing, corrective design changes, and final system validation. Results from this work will be documented for continued development by future RE-RASSOR teams.

---

## License and Attribution

This repository contains a combination of inherited work from previous RE-RASSOR teams and original work created by the 2026 RE-RASSOR Arm Development Team.

Where possible, original sources have been referenced and credited. Users should review the source repositories and any associated licensing information before redistributing inherited materials.

Additional external design references used during development are documented in the project design documentation, including their applicable attribution and licensing requirements.

For questions regarding ownership or attribution of specific resources, consult the original repositories and source documentation referenced by this project.