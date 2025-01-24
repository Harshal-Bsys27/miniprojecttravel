
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getDatabase,set,get,ref } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";
 
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBoqMEbJt17OJ-aAaiDQcLCRQ1HeHan-vM",
  authDomain: "letstravelsignup.firebaseapp.com",
  projectId: "letstravelsignup",
  storageBucket: "letstravelsignup.firebasestorage.app",
  messagingSenderId: "44593253718",
  appId: "1:44593253718:web:1e8862f5c0493811ccdaf7"
};
 // Initialize Firebase
 const app = initializeApp(firebaseConfig);
 
 const db = getDatabase(app)

 function writeUserData(userId,name,email) { 
  set(ref(db, 'users/' + userId), {
    name: name,
    email: email,
  })
}
  writeUserData (1,"HARSHAL","harshal768@gmail.com"); 
 
 