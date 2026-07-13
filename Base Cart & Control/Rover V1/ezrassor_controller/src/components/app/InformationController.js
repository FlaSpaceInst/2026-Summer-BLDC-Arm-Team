import React from "react";
import {
  Linking,
  Text,
  View,
  Pressable,
  TouchableHighlight,
} from "react-native";
import Modal from "react-native-modal";
import * as ScreenOrientation from 'expo-screen-orientation';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import PaverArmControllerStyle from 'ezrassor-app/src/styles/controllerPaverArm';
import ControllerStyle from "ezrassor-app/src/styles/controller";

/**
 * Modal-like React component to show the about-the-app info while in <ControllerScreen>.
 */
export default class InformationController extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      devModalVisible: false,
      helpModalVisible: false,
    };
  }

  setDevModalVisible(visible) {
    this.setState({ devModalVisible: visible });
  }

  setHelpModalVisible(visible) {
    this.setState({ helpModalVisible: visible})
  }

  componentDidMount() {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
  }

  render() {
    return (
      <View style={{ flexDirection: "row" }}>

        {/* Left-side of modal. */}
        <View style={ControllerStyle.columnHeader}>

          {/* About-the-team blurb. */}
          <Text style={ControllerStyle.textHeader}>RASSOR Team</Text>
          <Text style={[ControllerStyle.textTiny, ControllerStyle.columnHyperlink]} onPress={() => { this.setDevModalVisible(true); }}>
            Show Team
          </Text>

          <View style={{ marginVertical: 10 }} />

          {/* Bug-report blurb. */}
          <Text style={ControllerStyle.textHeader}>Send Bug Reports</Text>
          <View style={{ marginVertical: 1 }} />
          <Text style={[ControllerStyle.textTiny, ControllerStyle.columnText]}>
            Visit
            <Text
              style={[ControllerStyle.textTiny, ControllerStyle.columnHyperlink]}
              onPress={() => Linking.openURL("https://github.com/FlaSpaceInst/EZ-RASSOR/issues")}
            >
              {" "}GitHub{" "}
            </Text>
            to create an issue.
          </Text>

          <View style={{ marginVertical: 10 }} />

          {/* Controller help blurb. */}
          <Text style={ControllerStyle.textHeader}>Controller Help</Text>
          <Text style={[ControllerStyle.textTiny, ControllerStyle.columnHyperlink]} onPress={() => { this.setHelpModalVisible(true); }}>
            Show Help
          </Text>

          {/* About-the-team modal. */}
          <Modal
            style={ControllerStyle.modalViewContainer}
            isVisible={this.state.devModalVisible}
            supportedOrientations={['landscape']}
            onSwipeComplete={() => this.setDevModalVisible(false)}
            swipeDirection={["down", "up", "left", "right"]}
            onRequestClose={() => this.setDevModalVisible(false)}
          >
            <View style={{ flexDirection: "row" }}>
              <View style={ControllerStyle.columnHeader}>
                <View style={{ marginVertical: 10 }} />
                <Text style={ControllerStyle.textSmall}>EZ-RASSOR</Text>
                <View style={{ marginVertical: 10 }} />
                <View style={{ flexDirection: "row" }}>
                  <View>
                    <Text style={ControllerStyle.columnText}>
                      Christian Vincent
                    </Text>
                    <Text style={ControllerStyle.columnText}>
                      Noah Gregory
                    </Text>
                    <Text style={ControllerStyle.columnText}>
                      Adam Whitlock
                    </Text>
                    <Text style={ControllerStyle.columnText}>
                      Jose Torres
                    </Text>
                    <Text style={ControllerStyle.columnText}>
                      Christian Middleton
                    </Text>
                    <Text style={ControllerStyle.columnText}>
                      Riya Singh
                      </Text>
                  </View>
                  <View style={{ marginHorizontal: 5 }} />
                </View>
              </View>
              <View
                style={{
                  flex: 0.5,
                  borderRadius: 20,
                  backgroundColor: "#2e3030",
                }}
              ></View>
              <View style={ControllerStyle.columnHeader}>
                <Text style={ControllerStyle.textSmall}>RE-RASSOR CART</Text>
                <View style={{ marginVertical: 10 }} />
                <View style={{ flexDirection: "row" }}>
                  <View>
                    <Text style={ControllerStyle.columnText}>
                      University of Central Florida                     
                    </Text>
                    <Text style={ControllerStyle.columnText}>
                      Senior Design Teams                    
                    </Text>
                    <Text style={ControllerStyle.columnText}>
                    [2021 to 2024]                      
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Modal back button. */}
            <Pressable
              style={[ControllerStyle.buttonModalContainer]}
              onPress={() => {
                this.setDevModalVisible(false);
              }}
            >
              <Text
                adjustsFontSizeToFit={true}
                numberOfLines={1}
                style={[ControllerStyle.buttonText]}
              >
                Back
              </Text>
            </Pressable>
          </Modal>

          {/* Help modal */}
          <Modal
            style={PaverArmControllerStyle.modalViewContainer}
            isVisible={this.state.helpModalVisible}
            supportedOrientations={['landscape']}
            onSwipeComplete={() => this.setHelpModalVisible(false)}
            swipeDirection={["down", "up", "left", "right"]}
            onRequestClose={() => this.setHelpModalVisible(!this.state.infoModalVisible)}>
      
            <TouchableHighlight style={{ justifyContent: 'center' }}>
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 25}}>
                  <Text style={PaverArmControllerStyle.textLarge}>Controller Help</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'center', paddingHorizontal:"2%"}}>
                  <View style={{ flex: 1}} >
                    <FontAwesome style={{textAlign:'center'}} name="wifi" size={30} color='#fff'/>
                    <Text style={PaverArmControllerStyle.textSmallCenter}> 
                      Connects to the server with input string: {'\n'} 
                      IP : PORT
                    </Text>
                  </View>   

                  {/* Vertical separating bar. */}
                  <View style={{ flex: 0.01, borderRadius: 2, backgroundColor: "#2e3030", marginHorizontal:"0.5%" }}></View>

                  <View style={{ flex: 1}} >
                    <FontAwesome style={{textAlign:'center'}} name="stop-circle-o" size={30} color='#fff'/>
                      <Text style={PaverArmControllerStyle.textSmallCenter}> 
                      Emergency stop for manual movements
                      </Text>
                    </View>

                   {/* Vertical separating bar. */}
                  <View style={{ flex: 0.01, borderRadius: 2, backgroundColor: "#2e3030", marginHorizontal:"0.5%" }}></View>
                    
                  <View style={{ flex: 1}} >
                    <MaterialCommunityIcons style={{textAlign:'center'}} name="robot-industrial" size={32} color="#fff"/>
                    <Text style={PaverArmControllerStyle.textSmallCenter}> 
                      Navigate to Paver Arm Controller
                    </Text>
                  </View>

                  {/* Vertical separating bar. */}
                  <View style={{ flex: 0.01, borderRadius: 2, backgroundColor: "#2e3030", marginHorizontal:"0.5%" }}></View>

                  <View style={{ flex: 1}} >
                  <MaterialCommunityIcons style={{textAlign:'center'}} name="robot" size={32} color='#fff'/>
                    <Text style={PaverArmControllerStyle.textSmallCenter}> 
                      Opens autonomy functions for the rover
                    </Text>
                  </View>

                  {/* Vertical separating bar. */}
                  <View style={{ flex: 0.01, borderRadius: 2, backgroundColor: "#2e3030", marginHorizontal:"0.5%" }}></View>

                  <View style={{ flex: 1}} >
                  <FontAwesome style={{textAlign:'center'}} name="video-camera" size={35} color='#fff'/>
                    <Text style={PaverArmControllerStyle.textSmallCenter}> 
                      Turn on Live Stream
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableHighlight>

            {/* Modal back button. */}
            <Pressable
              style={[ControllerStyle.buttonModalContainer]}
              onPress={() => {
                this.setHelpModalVisible(false);
              }}
            >
              <Text
                adjustsFontSizeToFit={true}
                numberOfLines={1}
                style={[ControllerStyle.buttonText]}
              >
                Back
              </Text>
            </Pressable>
          </Modal> 

        </View>

        {/* Vertical separating bar. */}
        <View style={{ flex: 0.5, borderRadius: 20, backgroundColor: "#2e3030", }}></View>

        {/* Right-side of modal. */}
        <View style={ControllerStyle.columnHeader}>

          {/* Project-mission blurb. */}
          <Text style={ControllerStyle.textHeader}>Our Mission</Text>
          <View style={{ marginVertical: 10 }} />
          <Text style={ControllerStyle.columnText}>
            The EZ-RASSOR (EZ Regolith Advanced Surface Systems Operations
            Robot) is an inexpensive, autonomous, regolith-mining robot designed
            to mimic the look and abilities of NASA's RASSOR on a smaller scale.
            The primary goal of the EZ-RASSOR is to provide a functioning
            demonstration robot for visitors at the Kennedy Space Center.
          </Text>
          <View style={{ marginVertical: 10 }} />
          <Text style={[ControllerStyle.textTiny, ControllerStyle.columnText]}>
            Visit
            <Text
              style={[ControllerStyle.textTiny, ControllerStyle.columnHyperlink]}
              onPress={() => Linking.openURL("https://github.com/FlaSpaceInst/EZ-RASSOR")}
            >
              {" "}our GitHub repository{" "}
            </Text>
            for more information.
          </Text>
        </View>

      </View>
    );
  }
}