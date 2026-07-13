import {Robot, Operation} from 'ezrassor-app/src/enumerations/robot-commands-paver-arm';
import HTTP from 'ezrassor-app/src/api/web-commands';

export default class EZRASSOR { 

    constructor(host, route = '') {
        this.host = host;
        this.route = route;
        this.setCoordinate(0, 0);
        this.allStop();
    }

    // Getters and Setters
    get host () {
        return this._host;
    }

    set host(value) {
        console.log(value);
        this._host = value;
    }

    get route() {
        return this._route;
    }

    set route(value) {
        if(value[0] === '/') {
            this._route = value.substring(1);
            return;
        }

        this._route = value;
    }

    get coordinate() {
        return this._coordinate;
    }

    setCoordinate(combinedCoordinate) {
       
        var coordinates = (typeof combinedCoordinate === "string") ? combinedCoordinate.trim() : '0';
        var split = coordinates.split(',');

        var x = split[0];        
        var y = '0';
        
        if (split.length == 2 && split[1] != '') {
            y = split[1];
        }

        this._coordinate = {
            x: parseInt(x),
            y: parseInt(y)
        }
    }

    // Build complete apiPath for HTTP requests
    get apiPath() {
        return this.host + this.route;
    } 

    // Return custom twist message
    get twistMsg() {
        return JSON.stringify(this._twistMsg);
    }

    // Update only the instruction needed
    updateTwistMsg(instruction) {
        this._twistMsg = instruction; 
    }

    //This need to be fixed
    updateAutonomyTwistMsg(instruction) {
        if(instruction == Operation.DRIVE || instruction == Operation.FULLAUTONOMY) {
            this._twistMsg = {
                autonomous_toggles:instruction,
                target_coordinate:this.coordinate
            }
            return;
        }

        this._twistMsg = {autonomous_toggles:instruction};
    }
   
    // Stop all robot operations
    allStop = () => {
        this._twistMsg = { 
            plate_joint_action: "STOP",
            shoulder_joint_action: "STOP",
            forearm_joint_action: "STOP",
            end_effector_action: "STOP",
            // autonomous_toggles:0
            // partial_autonomy: "HOME"
        }

        HTTP.doPost(this.apiPath, this.twistMsg);
    }

    // Execute the corresponding robot command from the enumeration items passed in
    executeRobotCommand(part, operation) {
        // Needed when a stop override needs to occur
        if (part == Robot.ALL && operation == Operation.STOP) {
            this.allStop();
            return;
        }

        switch(part) {
            case Robot.PLATE:
                this.updateTwistMsg({plate_joint_action:operation});
                break;
            case Robot.SHOULDER:
                this.updateTwistMsg({shoulder_joint_action:operation});
                break;
            case Robot.FOREARM:
                this.updateTwistMsg({forearm_joint_action:operation});
                break;
            case Robot.ENDEFFECTOR:
                this.updateTwistMsg({end_effector_action: operation});
                break;
            case Robot.AUTONOMY:
                this.updateTwistMsg({partial_autonomy:operation});
                break;
            default:
                console.log('Invalid robot part selected');
                return;
        }

        console.log("Paver Arm API: ", this.apiPath); // verifying API address
        HTTP.doPost(this.apiPath, this.twistMsg);
    } 
}