import React, {useState} from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Platform,
  Linking,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {pipe, evolve} from 'ramda';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import {InAppBrowser} from 'react-native-inappbrowser-reborn';
import {v4 as uuid} from 'uuid';
import querystring from 'query-string';
import 'react-native-get-random-values';

const AUTHORIZATION_URL = 'https://twitter.com/i/oauth2/authorize';
const ACCESS_TOKEN_URL: string = 'https://api.twitter.com/2/oauth2/token';
const clientID = 'bFBFT2NRVFFOLVk4THRsZU5ULTk6MTpjaQ';
const clientSecret = 'F4uOGoEymvE8IVTTErVIjUhjvEdAXLLUpHK2F7g5NyOGOfrjcM';
const redirectUri = 'https://erangad.github.io/TwitterOAuth';
const permissions = ['offline.access', 'users.read'];

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [isInAppBrowserOpen, setIsInAppBrowserOpen] = useState(false);

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };
  const redirectUri = 'twitterlogin://callback';

  const getDeepLink = () => {
    return 'twitterlogin://callback';
  };

  const cleanUrlString = (state: string) => state.replace('#!', '');

  const getCodeAndStateFromUrl = pipe(
    querystring.extract,
    querystring.parse,
    evolve({state: cleanUrlString}),
  );

  const getPayloadForToken = ({
    code,
    currentAuthState,
  }: {
    code: string;
    currentAuthState: string;
  }) =>
    querystring.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: getDeepLink(), // Use the same callback here
      client_id: clientID,
      client_secret: clientSecret,
      code_verifier: currentAuthState,
    });

  const fetchToken = async (payload: any) => {
    const response = await fetch(ACCESS_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload,
    });

    if (!response.ok) {
      const errorMessage = await response.text(); // Get error message from response
      console.error('Error fetching token:', errorMessage);
      throw new Error(errorMessage);
    }

    return await response.json();
  };

  const getAccessToken = async (code: any, currentAuthState: string) => {
    const payload = getPayloadForToken({code, currentAuthState});
    const token = await fetchToken(payload);
    console.log(token, '??');
    return token.error ? {} : token;
  };

  const onLoginPressed = async () => {
    if (isInAppBrowserOpen) {
      console.log('InAppBrowser is already open. Please close it first.');
      return;
    }

    setIsInAppBrowserOpen(true);
    const authState = uuid();

    const inAppBrowserAuthURL = `${AUTHORIZATION_URL}?${querystring.stringify({
      response_type: 'code',
      client_id: clientID,
      scope: permissions.join(' ').trim(),
      state: authState,
      redirect_uri: getDeepLink(), // Use the direct callback
      code_challenge: authState,
      code_challenge_method: 'plain',
    })}`;

    try {
      if (await InAppBrowser.isAvailable()) {
        const response: any = await InAppBrowser.openAuth(
          inAppBrowserAuthURL,
          getDeepLink(),
          {
            ephemeralWebSession: false,
            enableUrlBarHiding: true,
            enableDefaultShare: false,
          },
        );
        const url = response.url;
        const {code, state} = getCodeAndStateFromUrl(url);

        if (state !== authState) {
          console.error('State does not match');
          return;
        }

        const token = await getAccessToken(code, authState);
        console.log('INFO::accessToken::response::', token);
      } else {
        Linking.openURL(inAppBrowserAuthURL);
      }
    } catch (error) {
      console.error('Authentication Error:', error);
    } finally {
      setIsInAppBrowserOpen(false);
    }
  };

  return (
    <SafeAreaView style={styles.background}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <View style={{justifyContent: 'center', alignItems: 'center'}}>
        <TouchableOpacity onPress={onLoginPressed} style={styles.buttonStyle}>
          <Text>X Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  background: {flex: 1, justifyContent: 'center'},
  buttonStyle: {
    height: 100,
    width: 100,
    backgroundColor: 'red',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
