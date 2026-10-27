import { Robot, WheelOperation, Operation } from '../enumerations/robot-commands';
import HTTP from '../api/web-commands';

const DEFAULT_EXT = '/';

export default class EZRASSOR {

    constructor(host, route = '') {
        this.host = host;
        this.route = route;
        this.setCoordinate('0,0');
        this._twistMsg = {
            autonomous_toggles: 0,
            target_coordinate: this.coordinate,
            wheel_instruction: 'none',
            front_arm_instruction: 0,
            back_arm_instruction: 0,
            front_drum_instruction: 0,
            back_drum_instruction: 0
        };
    }

    // Getters and Setters
    get host() {
        return this._host;
    }

    set host(value) {
        this._host = value;
    }

    get route() {
        return this._route;
    }

    set route(value) {
        if (value && value[0] === '/') {
            this._route = value.substring(1);
            return;
        }

        this._route = value || '';
    }

    get coordinate() {
        return this._coordinate;
    }

    setCoordinate(combinedCoordinate) {
        const coordinates = (typeof combinedCoordinate === 'string') ? combinedCoordinate.trim() : '0,0';
        const split = coordinates.split(',');

        const x = split[0] || '0';
        let y = '0';
        if (split.length == 2 && split[1] !== ''){
            y = split[1];
        }

        this._coordinate = {
            x: parseInt(x, 10) || 0,
            y: parseInt(y, 10) || 0
        };
    }

    // Build complete apiPath for HTTP requests
    get apiPath() {
        return this.host + this.route;
    }

    // Return the current command as JSON for the HTTP layer.
    get twistMsg() {
        return JSON.stringify(this._twistMsg);
    }

    // Update only the instruction needed
    updateTwistMsg(instruction) {
        this._twistMsg = instruction;
    }

    updateWheelTwistMsg(operation) {
        let instruction = null;

        switch (operation) {
            case WheelOperation.FORWARD:
                instruction = { wheel_action: { linear_x: WheelOperation.LINEAR_X_FORWARD, angular_z: 0 } };
                break;
            case WheelOperation.BACKWARD:
                instruction = { wheel_action: { linear_x: WheelOperation.LINEAR_X_BACKWARD, angular_z: 0 } };
                break;
            case WheelOperation.LEFT:
                instruction = { wheel_action: { linear_x: 0, angular_z: WheelOperation.ANGULAR_Z_LEFT } };
                break;
            case WheelOperation.RIGHT:
                instruction = { wheel_action: { linear_x: 0, angular_z: WheelOperation.ANGULAR_Z_RIGHT } };
                break;
            case WheelOperation.STOP:
                instruction = { wheel_action: { linear_x: 0, angular_z: 0 } };
                break;
            default:
                console.log('Invalid wheel operation selected');
                return false;
        }

        this._twistMsg = instruction;
        return true;
    }

    // Kept for compatibility with the existing autonomy controller. Still need to be complete.
    updateAutonomyTwistMsg(instruction) {
        if (instruction === Operation.DRIVE || instruction === Operation.FULLAUTONOMY) {
            this._twistMsg = {
                autonomous_toggles: instruction,
                target_coordinate: this.coordinate
            };
            return;
        }

        this._twistMsg = { autonomous_toggles: instruction };
    }

    // Stop all robot operations and send the stop command.
    allStop = () => {
        this._twistMsg = {
            autonomous_toggles: 0,
            target_coordinate: this.coordinate,
            wheel_instruction: 'none',
            front_arm_instruction: 0,
            back_arm_instruction: 0,
            front_drum_instruction: 0,
            back_drum_instruction: 0
        };

        return HTTP.doPost(this.apiPath, this.twistMsg, DEFAULT_EXT);
    };

    // Execute the corresponding robot command from the enumeration items passed in
    executeRobotCommand(part, operation) {
        if (part === Robot.ALL && operation === Operation.STOP) {
            return this.allStop();
        }

        switch (part) {
            case Robot.FRONTARM:
                this.updateTwistMsg({ front_arm_action: operation });
                break;
            case Robot.BACKARM:
                this.updateTwistMsg({ back_arm_action: operation });
                break;
            case Robot.FRONTDRUM:
                this.updateTwistMsg({ front_drum_action: operation });
                break;
            case Robot.BACKDRUM:
                this.updateTwistMsg({ back_drum_action: operation });
                break;
            case Robot.WHEELS:
                if (!this.updateWheelTwistMsg(operation)) {
                    return;
                }
                break;
            case Robot.AUTONOMY:
                this.updateAutonomyTwistMsg(operation);
                break;
            default:
                console.log('Invalid robot part selected');
                return;
        }

        return HTTP.doPost(this.apiPath, this.twistMsg, DEFAULT_EXT);
    }
}
