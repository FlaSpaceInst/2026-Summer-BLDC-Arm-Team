# RE-RASSOR Arm Development

## Overview

The 2026 RE-RASSOR Arm Development Team is responsible for designing, prototyping, and integrating a modular robotic arm with the existing RE-RASSOR rover platform. The project builds upon previous RE-RASSOR Senior Design efforts while introducing new mechanical, software, and systems engineering capabilities focused on robotic manipulation.

The preliminary design phase has been completed and includes engineering requirements, trade studies, system architecture, project planning, software communication design, and a comprehensive design package supporting future development. Current efforts are focused on CAD development, prototype fabrication, software integration, and validation.

In addition to developing a functional robotic arm, this project emphasizes documentation, maintainability, and knowledge transfer to ensure future RE-RASSOR teams can continue development rather than restarting the design process.

---

## Project Background

The RE-RASSOR platform is a long-term educational and engineering project maintained through the Florida Space Institute (FSI) and supported by multiple University of Central Florida (UCF) Senior Design teams. The platform has undergone several iterations over multiple years, with each team contributing new capabilities, hardware improvements, software features, and documentation.

This repository serves as the development repository for the 2026 RE-RASSOR Arm Development Team and contains both inherited project resources and new development work completed during the Summer and Fall 2026 semesters.

---

## Acknowledgements and Prior Work

This project builds upon significant work completed by previous RE-RASSOR teams.

### 2023 RE-RASSOR Extension Team

The rover platform, base cart systems, software architecture, ROS integration, networking components, and core rover functionality contained within the **Base Cart & Control** directory originate from the 2023 RE-RASSOR Extension Team.

Original repository:

https://github.com/FlaSpaceInst/2023-RE-RASSOR-Extension/tree/cart_desktop

The 2026 team did not develop the original rover platform and does not claim authorship of the inherited rover software, control systems, or base vehicle design.

### 2025 UCF BLDC Motor Control Team

The Brushless DC (BLDC) motor research, control systems, CAD resources, motor testing, and supporting documentation contained within the **BLDC CAD** directory originate from the 2025 UCF BLDC Motor Control Senior Design Team.

Original repository:

https://github.com/FlaSpaceInst/2025-Fall-UCF-BLDC-Motor-Control

The 2026 team utilizes this work as a technical reference and foundation for arm actuation development but does not claim authorship of the original BLDC motor project.

### 2026 RE-RASSOR Arm Development Team

The 2026 Senior Design Team is responsible for:

- Robotic arm design and development
- Arm integration with the existing rover platform
- New CAD models and prototype components
- Arm-related software modifications
- Testing and validation activities
- Documentation generated during the 2026 project cycle
- Future arm control functionality and user interface integration

Unless otherwise noted, materials located within the **Arm & Attachments** and **Documentation & Testing** directories are the work of the 2026 RE-RASSOR Arm Development Team.

---

## Objectives

The primary objectives of this project are:

- Design a functional robotic arm for the RE-RASSOR rover.
- Integrate arm controls with the existing rover control architecture.
- Utilize Brushless DC (BLDC) motors for arm actuation.
- Prototype, test, and validate arm functionality.
- Maintain compatibility with existing rover systems.
- Maintain clear and reproducible project documentation.
- Produce deliverables that can be continued and expanded by future teams.

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

Contains original development work produced by the 2026 RE-RASSOR Arm Development Team, including all mechanical design, prototype development, manufacturing resources, and supporting documentation for the robotic arm.

#### CAD Files

Contains all CAD resources developed throughout the project lifecycle.

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
- Testing procedures
- Validation results
- Meeting notes where applicable
- Research summaries
- Sponsor deliverables

---

## Current Development Status

The preliminary design phase has been completed, establishing the engineering foundation for the remainder of the project. Major deliverables completed during this phase include engineering requirements, system architecture, communication design, project planning, trade studies, development scheduling, and a comprehensive preliminary design document.

Current development efforts have transitioned toward implementation and are focused on:

- Refining mechanical CAD assemblies and individual components
- Fabricating and assembling prototype hardware
- Developing the robotic arm user interface
- Integrating HTTP communication with the existing rover architecture
- Preparing subsystem testing and validation procedures
- Expanding project documentation as development progresses

Future development will focus on complete subsystem integration, prototype validation, iterative design improvements, and final system testing throughout the Fall 2026 semester.

---

## License and Attribution

This repository contains a combination of inherited work from previous RE-RASSOR teams and original work created by the 2026 RE-RASSOR Arm Development Team.

Where possible, original sources have been referenced and credited. Users should review the source repositories and any associated licensing information before redistributing inherited materials.

For questions regarding ownership or attribution of specific resources, consult the original repositories referenced in this document.
