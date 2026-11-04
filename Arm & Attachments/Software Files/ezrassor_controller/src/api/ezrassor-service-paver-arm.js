import {Robot, Operation} from '../enumerations/robot-commands-paver-arm';
import HTTP from '../api/web-commands';

const DEFAULT_EXT = '/';

export default class EZRASSOR {

    constructor(host, route = '') {
        this.host = host;
        this.route = route;
        this.setCoordinate('0,0');
        this._commandQueue = Promise.resolve();
        this._twistMsg = {
            plate_joint_action: 'STOP',
            shoulder_joint_action: 'STOP',
            forearm_joint_action: 'STOP',
            end_effector_action: 'STOP'
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
        let coordinates = '0,0';
        if (typeof combinedCoordinate === 'string') {
            coordinates = combinedCoordinate.trim();
        }
        const split = coordinates.split(',');

        const x = split[0] || '0';
        var y = '0';
        if (split.length == 2 && split[1] !== ''){
            y = split[1];
        }

        this._coordinate = {
            x: parseInt(x, 10) || 0,
            y: parseInt(y, 10) || 0
        };
    }

    // Build complete apipath for HTTP requests
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

    // Kept for compatibility with the existing autonomy controller. Still need to be complete
    updateAutonomyTwistMsg(instruction) {
        if (instruction === Operation.FULLAUTONOMY) {
            this._twistMsg = { partial_autonomy: instruction };
            return;
        }

        this._twistMsg = { partial_autonomy: instruction };
    }

    // Keep quick press/release/reverse requests in their original order.
    // Capture the destination before queueing so old commands cannot be sent to a newly selected rover after the operator changes connections.
    sendCommand(message) {
        const commandHost = this.apiPath;
        const operation = this._commandQueue.then(() => HTTP.doPost(commandHost, message, DEFAULT_EXT));
        this._commandQueue = operation.catch(() => {});
        return operation;
    }

    // Speed-only command changes a moving joint's speed without reissuing direction command.
    setSpeed(part, speed) {
        if (![1, 2, 3].includes(speed)) {
            return Promise.reject(new Error('Arm speed must be 1, 2, or 3'));
        }
        let field = '';
        switch (part) {
            case Robot.PLATE:
                field = 'plate_joint_speed';
                break;
            case Robot.SHOULDER:
                field = 'shoulder_joint_speed';
                break;
            case Robot.FOREARM:
                field = 'forearm_joint_speed';
                break;
            case Robot.ENDEFFECTOR:
                field = 'end_effector_speed';
                break;
            default:
                return Promise.reject(new Error('Invalid arm part selected for speed change'));
        }
        const message = {};
        message[field] = speed;
        return this.sendCommand(JSON.stringify(message));
    }

    // Stop all paver arm operations and send the stop command.
    allStop = () => {
        this._twistMsg = {
            plate_joint_action: Operation.STOP,
            shoulder_joint_action: Operation.STOP,
            forearm_joint_action: Operation.STOP,
            end_effector_action: Operation.STOP
        };

        return this.sendCommand(this.twistMsg);
    };

    // Execute the corresponding paver arm command.
    executeRobotCommand(part, operation, speed = 2) {
        if (![1, 2, 3].includes(speed)) {
            return Promise.reject(new Error('Arm speed must be 1, 2, or 3'));
        }
        if (part === Robot.ALL && operation === Operation.STOP) {
            return this.allStop();
        }

        switch (part) {
            case Robot.PLATE:
                if (operation === Operation.STOP) {
                    this.updateTwistMsg({ plate_joint_action: operation });
                } else {
                    this.updateTwistMsg({ plate_joint_speed: speed, plate_joint_action: operation });
                }
                break;
            case Robot.SHOULDER:
                if (operation === Operation.STOP) {
                    this.updateTwistMsg({ shoulder_joint_action: operation });
                } else {
                    this.updateTwistMsg({ shoulder_joint_speed: speed, shoulder_joint_action: operation });
                }
                break;
            case Robot.FOREARM:
                if (operation === Operation.STOP) {
                    this.updateTwistMsg({ forearm_joint_action: operation });
                } else {
                    this.updateTwistMsg({ forearm_joint_speed: speed, forearm_joint_action: operation });
                }
                break;
            case Robot.ENDEFFECTOR:
                if (operation === Operation.STOP) {
                    this.updateTwistMsg({ end_effector_action: operation });
                } else {
                    this.updateTwistMsg({ end_effector_speed: speed, end_effector_action: operation });
                }
                break;
            case Robot.AUTONOMY:
                return Promise.reject(new Error('Autonomous arm control is not implemented.'));
            default:
                return Promise.reject(new Error('Invalid robot part selected.'));
        }

        return this.sendCommand(this.twistMsg);
    }
}
