import { NativeStackView } from '@react-navigation/native-stack';
import { StyleSheet } from 'react-native';
import { normalize } from '../functionality/display';

const ControllerStyle = StyleSheet.create({

        keyboardAwareScrollView: {
                flexGrow: 1,
                ...Platform.select({
                        ios: {
                                flex: 1
                        }
                })
        },

        fsiLogo: {
                height: '15%',
                width: '12%',
                alignSelf: 'flex-end',
                position: 'relative',
                right: 20,
                bottom: 10,
                overflow: 'hidden',
                resizeMode: 'cover',
                backgroundColor: '#2E3030',
                ...Platform.select({
                        ios: {
                                // bottom: 10 // as same as height
                        },
                        android: {
                                // bottom: 10
                        }
                })
        },

        //splash screen
        splashFsiLogo: {
                height: '55%',
                width: '55%',
                resizeMode: 'contain',
                backgroundColor: '#2E3030',
                marginTop: 70
        },


        splashLoading: {
                width: '100%',
                height: '100%',
                alignSelf: 'center'
        },

        buttonContainer: {
                backgroundColor: '#FFFFFF',
                fontFamily: 'NASA',
                borderRadius: 8,
                height: '10%',
                width: '12%',
                textAlign: 'center',
                alignSelf: 'flex-end',
                // position: 'absolute',
                left: 10,
                bottom: 10,
                ...Platform.select({
                        ios: { // as same as height
                                // marginRight: 20
                        },
                        android: {
                        }
                })
        },

        buttonModalContainer: {
                backgroundColor: '#FFFFFF',
                fontFamily: 'NASA',
                borderRadius: 8,
                height: '10%',
                width: '12%',
                textAlign: 'center',
                alignSelf: 'flex-end',
                position: "absolute",
                right: 10,
                bottom: 20,
                // position: 'absolute',
                // left: 10,
                ...Platform.select({
                        ios: { // as same as height
                                // marginRight: 20
                        },
                        android: {
                        }
                })
        },

        buttonText: {
                fontFamily: 'NASA',
                textAlign: 'center',
                fontSize: 50,
                ...Platform.select({
                        ios: {
                                // marginTop: 5, // as same as height
                        },
                        android: {}
                })
        },

        splashScreen: {
                display: 'flex',
                flex: 1,
                backgroundColor: '#2E3030',
                justifyContent: 'center',
                alignItems: 'center',
                alignContent: 'center'
        },

        screenLayout: {
                width: '100%',
                height: '100%',
                backgroundColor: '#2E3030',
                justifyContent: 'center', //Centered vertically
                alignItems: 'center',
                flexDirection: 'column',
                overflow: 'hidden'
        },

        title: {
                overflow: 'hidden',
                justifyContent: 'center',
                marginHorizontal: 10,
                color: '#fff',
                textAlign: 'center',
                backgroundColor: '#4a4d4e',
                fontFamily: 'NASA',
                flexWrap: 'nowrap',
                height: '20%',
                width: '60%',
                borderRadius: 15,

                ...Platform.select({
                        ios: {
                                // lineHeight: -50, // as same as height
                                // marginTop: 30,
                        },
                        android: {}
                })
        },

        titleText: {
                display: 'flex',
                padding: 0,
                textAlign: 'center',
                fontFamily: 'NASA',
                fontSize: 70,
                color: '#fff',
                // textAlignVertical: 'center',
                ...Platform.select({
                        ios: {
                                margin: 15
                        },
                        android: {
                        }
                })
        },


        containerTwo: {
                justifyContent: 'center',
                alignItems: 'center',
                padding: 10,
                borderRadius: 15,
                alignSelf: 'center',
                height: '80%',
                flexDirection: 'column',
        },


        connectButton: {
                flexDirection: 'row',
                backgroundColor: '#FFFFFF',
                display: 'flex',
                overflow: 'hidden',
                justifyContent: 'space-evenly',
                fontFamily: 'NASA',
                borderRadius: 8,
                textAlign: 'center',
                textAlignVertical: 'center',
                // height: '20%',
                height: (2 * normalize(45, 1.5)),
                lineHeight: (2 * normalize(45, 1.8)),
                width: '30%',
                marginTop: 5,
                marginBottom: 15
        },

        statusButton: {
                backgroundColor: '#3F4142',
                display: 'flex',
                overflow: 'hidden',
                justifyContent: 'center',
                fontFamily: 'NASA',
                borderRadius: 8,
                justifyContent: 'center',
                textAlign: 'center',
                textAlignVertical: 'center',
                height: '20%',
                width: '30%',
                marginTop: 5,
                marginBottom: 15
        },

        arrowRight: {
                resizeMode: 'contain',
                height: '80%',
                width: '10%',
                alignSelf: 'center',

        },

        connectButtonText: {
                fontSize: (normalize(45, 1.2)),
                alignSelf: 'center',
                fontFamily: 'NASA',
                justifyContent: 'center',
                textAlign: 'center',
                textAlignVertical: 'center',

                ...Platform.select({
                        android: {
                                marginBottom: 10
                        }
                })
        },


        statusButtonText: {
                justifyContent: 'center',
                textAlign: 'center',
                fontFamily: 'NASA',
                color: 'white',
                textAlignVertical: 'center',
                fontSize: 50
        },

        buttonLayoutContainer: {
                flex: 8,
                flexDirection: 'row',
                marginVertical: 10,
        },

        container: {
                flex: 1,
                backgroundColor: '#5D6061',
                alignItems: 'center',
                justifyContent: 'center',
        },

        videoScreenContainer: {
                flex: 1,
                backgroundColor: '#5D6061',
                alignItems: 'center',
                justifyContent: 'center',
        },

        testItem: {
                backgroundColor: '#205295',
        },

        testItem: {
                backgroundColor: '#205295',
        },

        dPadLeft: {
                flex: 1,
                backgroundColor: '#3a3d3d',
                opacity: 0.5,
                borderRadius: 10,
                marginHorizontal: 10,
                elevation: 5,
                justifyContent: 'center',
                alignItems: 'center'
        },

        dPadRight: {
                flex: 1,
                backgroundColor: '#3a3d3d',
                opacity: 0.5,
                borderRadius: 10,
                marginRight: 10,
                elevation: 5,
                justifyContent: 'center',
                alignItems: 'center'
        },

        drumFunctionContainer: {
                flex: 6,
                justifyContent: 'center',
                marginHorizontal: 10,
                padding: 10,
                borderRadius: 10,
                elevation: 3,
                backgroundColor: 'transparent',
                shadowColor: 'transparent',
        },

        wheelFunctionContainer: {
                flex: 3,
                marginLeft: 10,
                borderRadius: 10,
                elevation: 3,
                backgroundColor: '#2e3030'
        },

        headerContainer: {
                flex: 1,
                flexDirection: 'row',
                marginTop: "0.5%",
                marginHorizontal: 0,
                elevation: 3,
                backgroundColor: '#2e3030',
                opacity: 0.5,
                borderRadius: 10,
                paddingHorizontal: 5,
                justifyContent: 'center',
                alignItems: 'center',
                marginHorizontal: "1%"
        },

        image: {
                flex: 1,
                width: null,
                height: null,
                resizeMode: 'contain',
                paddingVertical: 20,
        },

        textLarge: {
                fontFamily: 'NASA',
                fontSize: 30,
                color: '#fff'
        },

        textMedium: {
                fontFamily: 'NASA',
                flex: 4,
                fontSize: 25,
                color: '#fff',
                textAlign: 'center',
                textAlignVertical: 'center',
        },

        textHeader: {
                fontFamily: 'NASA',
                fontSize: 22,
                color: '#fff'
        },


        textSmall: {
                position: "absolute",
                top: 5,
                fontFamily: 'NASA',
                fontSize: 22,
                color: '#fff'
        },

        textTiny: {
                fontFamily: 'NASA',
                fontSize: 12,
                color: '#fff'
        },

        columnText: {
                color: '#fff',
                textAlign: 'center'
        },

        columnHyperlink: {
                color: 'cornflowerblue',
                textAlign: 'center'
        },

        columnHeader: {
                flex: 20,
                marginHorizontal: 15,
                justifyContent: 'center',
                alignItems: 'center'
        },

        modalViewContainer: {
                borderRadius: 25,
                backgroundColor: '#5D6061',
        },

        modalButton: {
                flex: 1,
                backgroundColor: '#767676',
                borderRadius: 100,
                marginHorizontal: 15,
                justifyContent: 'center',
                alignItems: 'center',
                height: 100,
                elevation: 5,
        },

        upAndDownDPad: {
                width: 60,
                height: 'auto',
                marginHorizontal: 5,
                backgroundColor: '#3a3d3d',
                opacity: 0.5,
                borderRadius: 10,
                margin: 10,
                elevation: 5,
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: 'transparent',
                resizeMode: 'contain',
        },

        ipInputBox: {
                display: 'flex',
                height: '30%',
                width: '70%',
                backgroundColor: '#BFBFBF',
                borderColor: 'gray',
                borderWidth: 1,
                color: 'black',
                borderRadius: 8,
                textAlign: 'center',
                fontFamily: 'NASA',
                ...Platform.select({
                        ios: {
                        },
                        android: {
                                paddingBottom: 5, paddingTop: 0,
                                textAlignVertical: 'center',
                                alignItems: 'center'
                        }
                })
        },

        ipInputBoxMedium: {
                backgroundColor: '#2e3030',
                borderColor: 'gray',
                color: '#fff',
                fontSize: 15,
                textAlign: 'center',
                fontFamily: 'NASA',

        },

        rightSideRow: {
                flexDirection: 'row',
                position: 'absolute',
                right: 0,
                shadowColor: 'transparent',
        }
});

export default ControllerStyle;