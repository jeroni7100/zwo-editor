import React, { useState, useEffect, useRef } from 'react'
import './Editor.css'
import { Colors, Zones } from '../Constants'
import Bar from '../Bar/Bar'
import Trapeze from '../Trapeze/Trapeze'
import FreeRide from '../FreeRide/FreeRide'
import Interval from '../Interval/Interval'
import Comment from '../Comment/Comment'
import Popup from '../Popup/Popup'
import Footer from '../Footer/Footer'
import Workouts from '../Workouts/Workouts'
import Checkbox from './Checkbox'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash, faArrowRight, faArrowLeft, faFile, faSave, faUpload, faDownload, faComment, faBicycle, faCopy, faClock, faShareAlt, faTimesCircle, faList, faBiking, faRunning } from '@fortawesome/free-solid-svg-icons'
import { ReactComponent as WarmdownLogo } from '../../assets/warmdown.svg'
import { ReactComponent as WarmupLogo } from '../../assets/warmup.svg'
import { ReactComponent as IntervalLogo } from '../../assets/interval.svg'
import { ReactComponent as SteadyLogo } from '../../assets/steady.svg'
import Builder from 'xmlbuilder'
import Converter from 'xml-js'
import helpers from '../helpers'
import firebase, { auth } from '../firebase'
import SignupForm from '../Forms/SignupForm'
import LoginForm from '../Forms/LoginForm'
import { Helmet } from "react-helmet";
import { RouteComponentProps } from 'react-router-dom';
import ReactGA from 'react-ga';
import Switch from "react-switch";
import { stringType } from 'aws-sdk/clients/iam'

interface Bar {
  id: string,
  time: number,
  length?: number, 
  type: string,
  power?: number,
  startPower?: number,
  endPower?: number,
  cadence: number,
  onPower?: number,
  offPower?: number,
  onDuration?: number,
  offDuration?: number,
  repeat?: number,
  pace?: number,
  onLength?: number,
  offLength?: number
}

interface Instruction {
  id: string,
  text: string,
  time: number,
  length: number
}

interface Message {
  visible: boolean,
  class?: string,
  text?: string
}

type TParams = { id: string };

const Editor = ({ match }: RouteComponentProps<TParams>) => {

  const { v4: uuidv4 } = require('uuid');

  const S3_URL = 'https://zwift-workout.s3-eu-west-1.amazonaws.com'

  const [id, setId] = useState(match.params.id === "new" ? (localStorage.getItem('id') || generateId()) : match.params.id)
  const [bars, setBars] = useState<Array<Bar>>(JSON.parse(localStorage.getItem('currentWorkout') || '[]'))
  const [actionId, setActionId] = useState<string | undefined>(undefined)
  const [ftp, setFtp] = useState(parseInt(localStorage.getItem('ftp') || '200'))
  const [weight, setWeight] = useState(parseInt(localStorage.getItem('weight') || '75'))
  const [instructions, setInstructions] = useState<Array<Instruction>>(JSON.parse(localStorage.getItem('instructions') || '[]'))
  const [cadence, setCadence] = useState(0)
  const [showCadenceInput, setShowCadenceInput] = useState(false)
  const [tags, setTags] = useState(JSON.parse(localStorage.getItem('tags') || '[]'))

  const [name, setName] = useState(localStorage.getItem('name') || '')
  const [description, setDescription] = useState(localStorage.getItem('description') || '')
  const [author, setAuthor] = useState(localStorage.getItem('author') || '')

  const [savePopupIsVisile, setSavePopupVisibility] = useState(false)
  const [sharePopupIsVisile, setSharePopupVisibility] = useState(false)

  const [user, setUser] = useState<firebase.User | null>(null)
  const [visibleForm, setVisibleForm] = useState('login') // default form is login

  const sherableLinkRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState('')

  const [message, setMessage] = useState<Message>()

  const [showWorkouts, setShowWorkouts] = useState(false)
  const [sportType, setSportType] = useState(localStorage.getItem('sportType') || 'bike')

  const [oneMileTime, setOneMileTime] = useState(localStorage.getItem('oneMileTime') || '')
  const [fiveKmTime, setFiveKmTime] = useState(localStorage.getItem('fiveKmTime') || '')
  const [tenKmTime, setTenKmTime] = useState(localStorage.getItem('tenKmTime') || '')
  const [halfMarathonTime, setHalfMarathonTime] = useState(localStorage.getItem('halfMarathonTime') || '')
  const [marathonTime, setMarathonTime] = useState(localStorage.getItem('marathonTime') || '')

  const DEFAULT_TAGS = ["Recovery", "Intervals", "FTP", "TT"]

  const db = firebase.database();

  useEffect(() => {

    setMessage({ visible: true, class: 'loading', text: 'Loading..' })

    db.ref('workouts/' + id).once('value').then(function (snapshot) {
      if (snapshot.val()) {
        // workout exist on server
        setAuthor(snapshot.val().author)
        setName(snapshot.val().name)
        setDescription(snapshot.val().description)
        setBars(snapshot.val().workout || [])
        setInstructions(snapshot.val().instructions || [])
        setTags(snapshot.val().tags || [])

        localStorage.setItem('id', id)

      } else {

        // workout doesn't exist on cloud 
        if (id === localStorage.getItem('id')) {
          // user refreshed the page
        } else {
          // treat this as new workout
          setBars([])
          setInstructions([])
          setName('')
          setDescription('')
          setAuthor('')
          setTags([])
        }

        localStorage.setItem('id', id)

      }
      console.log('useEffect firebase');

      //finished loading
      setMessage({ visible: false })
    })

    auth.onAuthStateChanged(user => {
      if (user) {
        setUser(user)
      }
    });

    window.history.replaceState('', '', `/editor/${id}`)

    ReactGA.initialize('UA-55073449-9');
    ReactGA.pageview(window.location.pathname + window.location.search);

  }, [id, db])

  useEffect(() => {

    localStorage.setItem('currentWorkout', JSON.stringify(bars))
    localStorage.setItem('ftp', ftp.toString())

    localStorage.setItem('instructions', JSON.stringify(instructions))
    localStorage.setItem('weight', weight.toString())

    localStorage.setItem('name', name)
    localStorage.setItem('description', description)
    localStorage.setItem('author', author)
    localStorage.setItem('tags', JSON.stringify(tags))
    localStorage.setItem('sportType', sportType)

    localStorage.setItem('oneMileTime', oneMileTime)
    localStorage.setItem('fiveKmTime', fiveKmTime)
    localStorage.setItem('tenKmTime', tenKmTime)
    localStorage.setItem('halfMarathonTime', halfMarathonTime)
    localStorage.setItem('marathonTime', marathonTime)


  }, [bars, ftp, instructions, weight, name, description, author, tags, sportType, oneMileTime, fiveKmTime, tenKmTime, halfMarathonTime, marathonTime])

  useEffect(() => {

    document.addEventListener('keydown', handleKeyPress)

    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    };
  })

  function generateId() {
    return Math.random().toString(36).substr(2, 16)
  }

  function newWorkout() {
    console.log('New workout')

    setId(generateId())
    setBars([])
    setInstructions([])
    setName('')
    setDescription('')
    setAuthor('')
    setTags([])

  }

  function handleOnChange(id: string, values: Bar) {
    const index = bars.findIndex(bar => bar.id === id)

    const updatedArray = [...bars]
    updatedArray[index] = values

    setBars(updatedArray)

  }

  function handleOnClick(id: string) {

    if (id === actionId) {
      setActionId(undefined)
    } else {
      setActionId(id)

      const index = bars.findIndex(bar => bar.id === id)
      const element = [...bars][index]

      setCadence(element.cadence)
    }
  }

  function handleKeyPress(event: { keyCode: any }) {

    switch (event.keyCode) {
      case 8:
        removeBar(actionId || '')
        break;
      case 37:
        // reduce time
        removeTimeToBar(actionId || '')
        break;
      case 39:
        // add time
        addTimeToBar(actionId || '')
        break;
      case 38:
        // add power
        addPowerToBar(actionId || '')
        break;
      case 40:
        // add power
        removePowerToBar(actionId || '')
        break;
      default:
        //console.log(event.keyCode);        
        break;
    }
  }

  function estimateRunningTimes() {

    const distances = [1.60934, 5, 10, 21.0975, 42.195, 1.60934]
    const times = [oneMileTime, fiveKmTime, tenKmTime, halfMarathonTime, marathonTime, '00:11:20']

    var estimatedTimes = helpers.calculateEstimatedTimes(distances, times)

    if (!oneMileTime) {
      setOneMileTime(estimatedTimes[0])
    }
    if (!fiveKmTime) {
      setFiveKmTime(estimatedTimes[1])
    }
    if (!tenKmTime) {
      setTenKmTime(estimatedTimes[2])
    }
    if (!halfMarathonTime) {
      setHalfMarathonTime(estimatedTimes[3])
    }
    if (!marathonTime) {
      setMarathonTime(estimatedTimes[4])
    }

  }

  function addBar(zone: number, duration: number = 300, cadence: number = 0, pace: number = 0, length: number = 200) {
    setBars(bars => [...bars, {
      time: duration,
      length: length,
      power: zone,
      cadence: cadence,      
      type: 'bar',
      id: uuidv4(),
      pace: pace
    }
    ])
  }

  function addTrapeze(zone1: number, zone2: number, duration: number = 300, pace: number = 0, length: number = 1000) {
    setBars(bars => [...bars, {
      time: duration,
      length: length,
      startPower: zone1,
      endPower: zone2,
      cadence: 0,
      pace: pace,
      type: 'trapeze',
      id: uuidv4()
    }
    ])
  }

  function addFreeRide(duration = 600) {
    setBars(bars => [...bars, {
      time: duration,
      cadence: 0,
      type: 'freeRide',
      id: uuidv4()
    }
    ])
  }

  function addInterval(repeat: number = 3, onDuration: number = 30, offDuration: number = 120, onPower: number = 1, offPower: number = 0.5, cadence: number = 0, pace: number = 0, onLength: number = 200, offLength: number = 200) {

    setBars(bars => [...bars, {
      time: (onDuration + offDuration) * repeat,
      length: (onLength + offLength) * repeat,
      id: uuidv4(),
      type: 'interval',
      cadence: cadence,
      repeat: repeat,
      onDuration: onDuration,
      offDuration: offDuration,
      onPower: onPower,
      offPower: offPower,
      pace: pace,
      onLength: onLength,
      offLength: offLength
    }
    ])
  }

  function addInstruction(text = '', time = 0, length = 0) {
    setInstructions(instructions => [...instructions, {
      text: text,
      time: time,
      length: length,
      id: uuidv4()
    }])
  }

  function changeInstruction(id: string, values: Instruction) {

    const index = instructions.findIndex(instructions => instructions.id === id)

    const updatedArray = [...instructions]
    updatedArray[index] = values
    setInstructions(updatedArray)

  }

  function deleteInstruction(id: string) {
    const updatedArray = [...instructions]
    setInstructions(updatedArray.filter(item => item.id !== id))
  }

  function removeBar(id: string) {
    const updatedArray = [...bars]
    setBars(updatedArray.filter(item => item.id !== id))
    setActionId(undefined)
  }

  function addTimeToBar(id: string) {
    const updatedArray = [...bars]

    const index = updatedArray.findIndex(bar => bar.id === id)
    const element = updatedArray[index]
    if (element && sportType === 'bike') {
      element.time = element.time + 5
      setBars(updatedArray)
    }

    if (element && sportType === 'run') {    
      element.length = (element.length || 0) + 200      
      setBars(updatedArray)
    }  
  }

  function removeTimeToBar(id: string) {
    const updatedArray = [...bars]

    const index = updatedArray.findIndex(bar => bar.id === id)
    const element = updatedArray[index]
    if (element && element.time > 5 && sportType === 'bike') {
      element.time = element.time - 5      
      setBars(updatedArray)
    }

    if (element && (element.length || 0) > 200 && sportType === 'run') {    
      element.length = (element.length || 0) - 200      
      setBars(updatedArray)
    }    
  }

  function addPowerToBar(id: string) {
    const updatedArray = [...bars]

    const index = updatedArray.findIndex(bar => bar.id === id)
    const element = updatedArray[index]
    if (element && element.power) {
      element.power = parseFloat((element.power + 1 / ftp).toFixed(3))
      setBars(updatedArray)
    }
  }

  function removePowerToBar(id: string) {
    const updatedArray = [...bars]

    const index = updatedArray.findIndex(bar => bar.id === id)
    const element = updatedArray[index]
    if (element && element.power && element.power >= Zones.Z1.min) {
      element.power = parseFloat((element.power - 1 / ftp).toFixed(3))
      setBars(updatedArray)
    }
  }

  function duplicateBar(id: string) {
    const index = bars.findIndex(bar => bar.id === id)
    const element = [...bars][index]

    if (element.type === 'bar') addBar(element.power || 80, element.time, element.cadence, element.pace || 0)
    if (element.type === 'freeRide') addFreeRide(element.time)
    if (element.type === 'trapeze') addTrapeze(element.startPower || 80, element.endPower || 160, element.time, element.pace || 0)
    if (element.type === 'interval') addInterval(element.repeat, element.onDuration, element.offDuration, element.onPower, element.offPower, element.cadence, element.pace, element.onLength, element.offLength)

    setActionId(undefined)
  }

  function moveLeft(id: string) {
    const index = bars.findIndex(bar => bar.id === id)
    // not first position of array
    if (index > 0) {
      const updatedArray = [...bars]
      const element = [...bars][index]
      updatedArray.splice(index, 1)
      updatedArray.splice(index - 1, 0, element)
      setBars(updatedArray)
    }
  }

  function moveRight(id: string) {
    const index = bars.findIndex(bar => bar.id === id)
    // not first position of array
    if (index < bars.length - 1) {
      const updatedArray = [...bars]
      const element = [...bars][index]
      updatedArray.splice(index, 1)
      updatedArray.splice(index + 1, 0, element)
      setBars(updatedArray)
    }
  }

  function saveCadence(id: string, cadence: number) {
    setCadence(cadence)

    const updatedArray = [...bars]

    const index = updatedArray.findIndex(bar => bar.id === id)
    const element = [...updatedArray][index]

    element.cadence = cadence
    setBars(updatedArray)

  }

  function saveWorkout() {
    setSavePopupVisibility(true)
  }

  function deleteWorkout() {
    // save to cloud (firebase) if logged in
    if (user) {
      const itemsRef = firebase.database().ref();

      var updates: any = {}
      updates[`users/${user.uid}/workouts/${id}`] = null
      updates[`workouts/${id}`] = null


      // save to firebase      
      itemsRef.update(updates).then(() => {
        newWorkout()
      }).catch((error) => {
        console.log(error);
        setMessage({ visible: true, class: 'error', text: 'Cannot delete workout' })
      });
    }
  }

  function shareWorkout() {
    if (user) {
      save()
      setCopied('')
      setSharePopupVisibility(true)
    } else {
      saveWorkout()
    }

  }

  function save() {

    setMessage({ visible: true, class: 'loading', text: 'Saving..' })

    var totalTime = 0
    var totalLength = 0

    let xml = Builder.begin()
      .ele('workout_file')
      .ele('author', author).up()
      .ele('name', name).up()
      .ele('description', description).up()
      .ele('sportType', sportType).up()
      .ele('tags')

    tags.map((tag: string) => {
      var t: Builder.XMLNode
      t = Builder.create('tag')
        .att('name', tag)
      xml.importDocument(t)
      return false;
    })

    xml = xml.up().ele('workout')


    bars.map((bar, index) => {

      var segment: Builder.XMLNode
      var ramp

      if (bar.type === 'bar') {
        segment = Builder.create('SteadyState')
          .att('Duration', sportType === 'bike' ? bar.time : bar.length)
          .att('Power', bar.power)
          .att('pace', bar.pace)

        // add cadence if not zero
        if (bar.cadence !== 0)
          segment.att('Cadence', bar.cadence)

      } else if (bar.type === 'trapeze' && bar.startPower && bar.endPower) {

        // index 0 is warmup
        // last index is cooldown
        // everything else is ramp

        ramp = 'Ramp'
        if (index === 0) ramp = 'Warmup'
        if (index === bars.length - 1) ramp = 'Cooldown'

        if (bar.startPower < bar.endPower) {
          // warmup
          segment = Builder.create(ramp)
            .att('Duration', sportType === 'bike' ? bar.time : bar.length)
            .att('PowerLow', bar.startPower)
            .att('PowerHigh', bar.endPower)
            .att('pace', bar.pace) // is this cadence?
        } else {
          // cooldown
          segment = Builder.create(ramp)
            .att('Duration', sportType === 'bike' ? bar.time : bar.length)
            .att('PowerLow', bar.startPower) // these 2 values are inverted
            .att('PowerHigh', bar.endPower) // looks like a bug on zwift editor            
            .att('pace', bar.pace) // is this cadence?
        }
      } else if (bar.type === 'interval') {
        // <IntervalsT Repeat="5" OnDuration="60" OffDuration="300" OnPower="0.8844353" OffPower="0.51775455" pace="0"/>
        segment = Builder.create('IntervalsT')
          .att('Repeat', bar.repeat)
          .att('OnDuration', sportType === 'bike' ? bar.onDuration : bar.onLength)
          .att('OffDuration', sportType === 'bike' ? bar.offDuration : bar.offLength)
          .att('OnPower', bar.onPower)
          .att('OffPower', bar.offPower)
          .att('pace', bar.pace)
      } else {
        // free ride
        segment = Builder.create('FreeRide')
          .att('Duration', bar.time)
        //.att('Cadence', 85) // add control for this?
      }

      // add instructions if present
      if (sportType === 'bike'){
        instructions.filter((instruction) => (instruction.time > totalTime && instruction.time <= (totalTime + bar.time))).map((i) => {
          return segment.ele('textevent', { timeoffset: (i.time - totalTime), message: i.text })
        })  
      }else{
        instructions.filter((instruction) => (instruction.length > totalLength && instruction.length <= (totalLength + (bar.length || 0)))).map((i) => {
          return segment.ele('textevent', { timeoffset: (i.length - totalLength), message: i.text })
        })
      }
      

      xml.importDocument(segment)

      totalTime = totalTime + bar.time
      totalLength = totalLength + (bar.length || 0)

      return false
    })

    const file = new Blob([xml.end({ pretty: true })], { type: 'application/xml' })

    // save to cloud (firebase) if logged in
    if (user) {
      const itemsRef = firebase.database().ref();

      const item = {
        id: id,
        name: name,
        description: description,
        author: author,
        workout: bars,
        tags: tags,
        instructions: instructions,
        userId: user.uid,
        updatedAt: Date()
      }

      const item2 = {
        name: name,
        description: description,
        updatedAt: Date()
      }

      var updates: any = {}
      updates[`users/${user.uid}/workouts/${id}`] = item2
      updates[`workouts/${id}`] = item


      // save to firebase      
      itemsRef.update(updates).then(() => {
        //upload to s3  
        upload(file, false)
        setMessage({ visible: false })

      }).catch((error) => {
        console.log(error);
        setMessage({ visible: true, class: 'error', text: 'Cannot save this' })
      });
    } else {
      // download workout without saving
      setMessage({ visible: false })
    }

    return file
  }

  function logout() {
    console.log('logout');

    auth.signOut().then(() => setUser(null))
  }

  function downloadWorkout() {

    const tempFile = save()
    const url = window.URL.createObjectURL(tempFile)

    var a = document.createElement("a")
    document.body.appendChild(a)
    a.style.display = "none"
    a.href = url
    a.download = `${id}.zwo`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  function handleUpload(file: Blob) {

    // ask user if they want to overwrite current workout first
    if (bars.length > 0) {
      if (!window.confirm('Are you sure you want to create a new workout?')) {
        return false
      }
    }

    newWorkout()
    upload(file, true)
  }

  function upload(file: Blob, parse = false) {
    fetch('/.netlify/functions/upload', {
      method: 'POST',
      body: JSON.stringify(
        {
          fileType: 'zwo',
          fileName: `${id}.zwo`
        })
    })
      .then(res => res.json())
      .then(function (data) {
        const signedUrl = data.uploadURL

        // upload to S3
        fetch(signedUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'zwo'
          },
          body: file
        })
          .then(response => response.text())
          .then(data => {
            console.log('File uploaded')

            // can parse now

            if (parse) fetchAndParse(id)
          })
          .catch(error => {
            console.error(error)
          })
      })
  }

  function fetchAndParse(id: string) {

    // remove previous workout
    setBars([])
    setInstructions([])

    fetch(`${S3_URL}/${id}.zwo`)
      .then(response => response.text())
      .then(data => {
        console.log(data)

        //now parse file  
        const workout = Converter.xml2js(data)
        const workout_file = workout.elements[0]

        if (workout_file.name === 'workout_file') {
          // file is valid
          const authorIndex = workout_file.elements.findIndex((element: { name: string }) => element.name === 'author')
          if (authorIndex && workout_file.elements[authorIndex].elements) {
            setAuthor(workout_file.elements[authorIndex].elements[0].text)
          }

          const nameIndex = workout_file.elements.findIndex((element: { name: string }) => element.name === 'name')
          if (nameIndex && workout_file.elements[nameIndex].elements) {
            setName(workout_file.elements[nameIndex].elements[0].text)
          }

          const descriptionIndex = workout_file.elements.findIndex((element: { name: string }) => element.name === 'description')
          if (descriptionIndex && workout_file.elements[descriptionIndex].elements) {
            setDescription(workout_file.elements[descriptionIndex].elements[0].text)
          }

          const workoutIndex = workout_file.elements.findIndex((element: { name: string }) => element.name === 'workout')

          var totalTime = 0

          workout_file.elements[workoutIndex].elements.map((w: { name: string; attributes: { Power: any; PowerLow: string; Duration: string; PowerHigh: string; Cadence: string; Repeat: string; OnDuration: string; OffDuration: string; OnPower: string, OffPower: string; Pace: stringType }; elements: any }) => {


            if (w.name === 'SteadyState')
              addBar(parseFloat(w.attributes.Power || w.attributes.PowerLow), parseFloat(w.attributes.Duration), parseFloat(w.attributes.Cadence || '0'), parseInt(w.attributes.Pace || '0'))

            if (w.name === 'Ramp' || w.name === 'Warmup' || w.name === 'Cooldown')
              addTrapeze(parseFloat(w.attributes.PowerLow), parseFloat(w.attributes.PowerHigh), parseFloat(w.attributes.Duration), parseInt(w.attributes.Pace || '0'))

            if (w.name === 'IntervalsT')
              addInterval(parseFloat(w.attributes.Repeat), parseFloat(w.attributes.OnDuration), parseFloat(w.attributes.OffDuration), parseFloat(w.attributes.OnPower), parseFloat(w.attributes.OffPower), parseFloat(w.attributes.Cadence || '0'), parseInt(w.attributes.Pace || '0'))

            if (w.name === 'FreeRide')
              addFreeRide(parseFloat(w.attributes.Duration))

            // check for instructions
            const textElements = w.elements
            if (textElements && textElements.length > 0) {

              textElements.map((t: { name: string; attributes: { message: string | undefined; timeoffset: string } }) => {

                if (t.name === 'textevent')
                  addInstruction(t.attributes.message, totalTime + parseFloat(t.attributes.timeoffset))

                return false
              })

            }

            totalTime = totalTime + parseFloat(w.attributes.Duration)
            // map functions expect return value
            return false
          })
        }
      })
      .catch(error => {
        console.error(error)
      })
  }

  function calculateSpeed(pace: number) {

    // return speed in m/s
    // speed  = distance / time
    const distances = [1.60934, 5, 10, 21.0975, 42.195]
    const times = [oneMileTime, fiveKmTime, tenKmTime, halfMarathonTime, marathonTime]

    return distances[pace] * 1000 / helpers.getTimeinSeconds(times[pace])

  }

  const renderBar = (bar: Bar) => (
    <Bar
      key={bar.id}
      id={bar.id}
      time={bar.time}
      length={bar.length || 200}
      power={bar.power || 100}
      cadence={bar.cadence}
      ftp={ftp}
      weight={weight}
      sportType={sportType}
      pace={bar.pace || 0}
      speed={calculateSpeed(bar.pace || 0)}
      onChange={(id: string, value: any) => handleOnChange(id, value)} // Change any to Interface Bar?
      onClick={(id: string) => handleOnClick(id)}
      selected={bar.id === actionId}
      showLabel={true}
    />
  )

  const renderTrapeze = (bar: Bar) => (
    <Trapeze
      key={bar.id}
      id={bar.id}
      time={bar.time}
      length={bar.length || 200}
      startPower={bar.startPower || 80}
      endPower={bar.endPower || 160}
      ftp={ftp}
      sportType={sportType}
      pace={bar.pace || 0}
      speed={calculateSpeed(bar.pace || 0)}
      onChange={(id: string, value: any) => handleOnChange(id, value)} // Change any to Interface Bar?
      onClick={(id: string) => handleOnClick(id)}
      selected={bar.id === actionId}
    />
  )

  const renderFreeRide = (bar: Bar) => (
    <FreeRide
      key={bar.id}
      id={bar.id}
      time={bar.time}
      sportType={sportType}
      onChange={(id: string, value: any) => handleOnChange(id, value)} // Change any to Interface Bar?
      onClick={(id: string) => handleOnClick(id)}
      selected={bar.id === actionId}
    />
  )

  const renderInterval = (bar: Bar) => (
    <Interval
      key={bar.id}
      id={bar.id}
      repeat={bar.repeat || 3}
      onDuration={bar.onDuration || 10}
      offDuration={bar.offDuration || 50}
      onPower={bar.onPower || 250}
      offPower={bar.offPower || 120} 
      onLength={bar.onLength || 200}
      offLength={bar.offLength || 200}     
      ftp={ftp}
      weight={weight}
      sportType={sportType}
      pace={bar.pace || 0}
      speed={calculateSpeed(bar.pace || 0)}
      handleIntervalChange={(id: string, value: any) => handleOnChange(id, value)}
      handleIntervalClick={(id: string) => handleOnClick(id)}
      selected={bar.id === actionId}
    />
  )

  const renderComment = (instruction: Instruction) => (
    <Comment
      key={instruction.id}
      instruction={instruction}
      sportType={sportType}
      onChange={(id: string, values: Instruction) => changeInstruction(id, values)}
      onDelete={(id: string) => deleteInstruction(id)} />
  )

  const renderRegistrationForm = () => {
    if (visibleForm === 'login') {
      return <LoginForm login={setUser} showSignup={() => setVisibleForm('signup')} dismiss={() => setSavePopupVisibility(false)} />
    } else {
      return <SignupForm signUp={setUser} showLogin={() => setVisibleForm('login')} dismiss={() => setSavePopupVisibility(false)} />
    }
  }

  const copyToClipboard = () => {
    const node = sherableLinkRef.current
    node?.select();
    document.execCommand('copy');
    setCopied('copied!')
  }

  const handleOnCheckboxChange = (option: any) => {
    if (tags.includes(option)) {
      const updatedArray = [...tags]
      setTags(updatedArray.filter(item => item !== option))
    } else {
      setTags((tags: any) => [...tags, option])
    }
  }

  const createCheckbox = (option: string) => {
    console.log(option);
    console.log(tags.includes(option));


    return (
      <Checkbox
        label={option}
        isSelected={tags.includes(option)}
        onCheckboxChange={() => handleOnCheckboxChange(option)}
      />
    )
  }

  const renderCheckboxes = () => {
    return DEFAULT_TAGS.map(createCheckbox)
  }

  function setPace(value: string, id: string) {
    const index = bars.findIndex(bar => bar.id === id)

    if (index !== -1) {
      const updatedArray = [...bars]
      const element = [...updatedArray][index]
      element.pace = parseInt(value)
      setBars(updatedArray)
    }
  }

  function getPace(id: string) {
    const index = bars.findIndex(bar => bar.id === id)

    if (index !== -1) {
      const element = [...bars][index]
      return element.pace
    }
  }

  return (
    <div className="container">
      <Helmet>
        <title>{name ? `${name} - Zwift Workout Editor` : "My Workout - Zwift Workout Editor"}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={name ? `${name} - Zwift Workout Editor` : "My Workout - Zwift Workout Editor"} />
        <meta property="og:description" content={description} />
        <link rel="canonical" href={`https://www.zwiftworkout.com/editor/${id}`} />
        <meta property="og:url" content={`https://www.zwiftworkout.com/editor/${id}`} />
      </Helmet>

      {message?.visible &&
        <div className={`message ${message.class}`}>
          {message.text}
          <button className="close" onClick={() => setMessage({ visible: false })}>
            <FontAwesomeIcon icon={faTimesCircle} size="lg" fixedWidth />
          </button>
        </div>
      }

      {showWorkouts &&
        <Popup width="500px" height="500px" dismiss={() => setShowWorkouts(false)}>
          {user ?
            <Workouts userId={user.uid} />
            :
            renderRegistrationForm()
          }
        </Popup>
      }

      {savePopupIsVisile &&
        <Popup width="500px" dismiss={() => setSavePopupVisibility(false)}>
          {user ?
            <div>
              <h2>Save Workout</h2>
              <div className="form-control">
                <label htmlFor="name">Workout Title</label>
                <input type="text" name="name" placeholder="Workout title" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="form-control">
                <label htmlFor="description">Workout description</label>
                <textarea name="description" placeholder="Workout description" value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
              </div>
              <div className="form-control">
                <label htmlFor="author">Workout Author</label>
                <input type="text" name="author" placeholder="Workout Author" value={author} onChange={(e) => setAuthor(e.target.value)} />
              </div>
              <div className="form-control">
                <label htmlFor="author">Workout Tags</label>
                {renderCheckboxes()}
              </div>
              <div className="form-control">
                <button className="btn btn-primary" onClick={() => {
                  save()
                  setSavePopupVisibility(false)
                }}>Save</button>
                <button className="btn" onClick={() => setSavePopupVisibility(false)}>Dismiss</button>
                <button onClick={() => logout()}>Logout</button>
              </div>
            </div>
            :
            renderRegistrationForm()
          }
        </Popup>
      }
      {sharePopupIsVisile &&
        <Popup width="500px" dismiss={() => setSharePopupVisibility(false)}>
          <div>
            <h2>Share Workout</h2>
            <div className="form-control">
              <label htmlFor="link">Share this link</label>
              <input type="text" name="link" value={"https://www.zwiftworkout.com/editor/" + id} ref={sherableLinkRef} />
              <button onClick={() => copyToClipboard()}><FontAwesomeIcon icon={faCopy} size="lg" fixedWidth /> {copied}</button>
              <button className="btn" onClick={() => setSharePopupVisibility(false)}>Dismiss</button>
            </div>
          </div>

        </Popup>
      }
      <div className="info">
        <div className="title">
          <h1>{name}</h1>
          <div className="description">{description}</div>
          <p>{author ? `by ${author}` : ''}</p>
        </div>
        <div className="workout">
          <div className="form-input">
            <label>Workout Time</label>
            <input className="textInput" value={helpers.getWorkoutLength(bars, sportType)} disabled />
          </div>
          {sportType === 'run' &&
            <div className="form-input">
              <label>Workout Distance</label>
              <input className="textInput" value={helpers.getWorkoutDistance(bars)} disabled />
            </div>
          }
          <div className="form-input">
            <label>TSS</label>
            <input className="textInput" value={helpers.getStressScore(bars, ftp)} disabled />
          </div>
          <div className="form-input">
            <label>Sport Type</label>
            <div className="switch">
              <FontAwesomeIcon className={`icon bike ${sportType === "bike" ? "active" : ""}`} icon={faBiking} size="lg" fixedWidth />
              <Switch onChange={() => setSportType(sportType === "run" ? "bike" : "run")} checked={sportType !== "bike"} checkedIcon={false} uncheckedIcon={false} onColor="#00C46A" offColor="#00C46A" />
              <FontAwesomeIcon className={`icon run ${sportType === "run" ? "active" : ""}`} icon={faRunning} size="lg" fixedWidth />
            </div>
          </div>
        </div>
      </div>
      {sportType === "run" &&
        <div className="run-workout">
          <div className="form-input">
            <label>1 Mile Time (hh:mm:ss)</label>
            <input className="textInput" value={oneMileTime} type="time" step="1" onChange={(e) => setOneMileTime(e.target.value)} />
          </div>
          <div className="form-input">
            <label>5 Km Time (hh:mm:ss)</label>
            <input className="textInput" value={fiveKmTime} type="time" step="1" onChange={(e) => setFiveKmTime(e.target.value)} />
          </div>
          <div className="form-input">
            <label>10 Km Time (hh:mm:ss)</label>
            <input className="textInput" value={tenKmTime} type="time" step="1" onChange={(e) => setTenKmTime(e.target.value)} />
          </div>
          <div className="form-input">
            <label>Half Marathon Time (hh:mm:ss)</label>
            <input className="textInput" value={halfMarathonTime} type="time" step="1" onChange={(e) => setHalfMarathonTime(e.target.value)} />
          </div>
          <div className="form-input">
            <label>Marathon Time (hh:mm:ss)</label>
            <input className="textInput" value={marathonTime} type="time" step="1" onChange={(e) => setMarathonTime(e.target.value)} />
          </div>
          <div className="form-input">
            <button onClick={estimateRunningTimes} className="btn">Estimate missing times</button>
          </div>
        </div>
      }

      <div className='editor'>
        {actionId &&
          <div className='actions'>
            <button onClick={() => moveLeft(actionId)} title='Move Left'><FontAwesomeIcon icon={faArrowLeft} size="lg" fixedWidth /></button>
            <button onClick={() => moveRight(actionId)} title='Move Right'><FontAwesomeIcon icon={faArrowRight} size="lg" fixedWidth /></button>
            <button onClick={() => removeBar(actionId)} title='Delete'><FontAwesomeIcon icon={faTrash} size="lg" fixedWidth /></button>
            <button onClick={() => duplicateBar(actionId)} title='Duplicate'><FontAwesomeIcon icon={faCopy} size="lg" fixedWidth /></button>
            {sportType === "bike" ?
              <>
                <button onClick={() => setShowCadenceInput(!showCadenceInput)} title='Cadence'><FontAwesomeIcon icon={faClock} size="lg" fixedWidth /></button>
                {(showCadenceInput || cadence !== 0) &&
                  <input className="textInput" type="number" min="40" max="150" name="cadence" value={cadence} onChange={(e) => saveCadence(actionId, parseInt(e.target.value))} />
                }
              </>
              :
              <select name="pace" value={getPace(actionId)} onChange={(e) => setPace(e.target?.value, actionId)} className="selectInput">
                <option value="0">1 Mile Pace</option>
                <option value="1">5K Pace</option>
                <option value="2">10K Pace</option>
                <option value="3">Half Marathon Pace</option>
                <option value="4">Marathon Pace</option>
              </select>
            }
          </div>
        }
        <div className='canvas'>
          <div className='slider'>
            {instructions.map((instruction) => renderComment(instruction))}
          </div>
          {actionId &&
            <div className='fader' onClick={() => setActionId(undefined)}></div>
          }
          {bars.map((bar) => {
            if (bar.type === 'bar') {
              return (renderBar(bar))
            }
            else if (bar.type === 'trapeze') {
              return (renderTrapeze(bar))
            }
            else if (bar.type === 'freeRide') {
              return (renderFreeRide(bar))
            }
            else if (bar.type === 'interval') {
              return (renderInterval(bar))
            } else {
              return false
            }
          })}
        </div>
        {sportType === 'bike' ?
          <div className='timeline'>
            <span>0:00</span>
            <span>0:10</span>
            <span>0:20</span>
            <span>0:30</span>
            <span>0:40</span>
            <span>0:50</span>
            <span>1:00</span>
            <span>1:10</span>
            <span>1:20</span>
            <span>1:30</span>
          </div>
        :
        <div className='timeline run'>
          <span>0</span>
          <span>1K</span>
          <span>2K</span>
          <span>3K</span>
          <span>4K</span>
          <span>5K</span>
          <span>6K</span>
          <span>7K</span>
          <span>8K</span>
          <span>9K</span>
          <span>10K</span>
          <span>11K</span>
          <span>12K</span>
          <span>13K</span>
          <span>14K</span>
          <span>15K</span>
        </div>
        }
        <div className='zones'>
          <div style={{ height: 250 * Zones.Z6.max }}>Z6</div>
          <div style={{ height: 250 * Zones.Z5.max }}>Z5</div>
          <div style={{ height: 250 * Zones.Z4.max }}>Z4</div>
          <div style={{ height: 250 * Zones.Z3.max }}>Z3</div>
          <div style={{ height: 250 * Zones.Z2.max }}>Z2</div>
          <div style={{ height: 250 * Zones.Z1.max }}>Z1</div>
        </div>
      </div>
      <div className='cta'>
        {sportType === "bike" ?
          <div>
            <button className="btn btn-square" onClick={() => addBar(0.5)} style={{ backgroundColor: Colors.GRAY }}>Z1</button>
            <button className="btn btn-square" onClick={() => addBar(Zones.Z2.min)} style={{ backgroundColor: Colors.BLUE }}>Z2</button>
            <button className="btn btn-square" onClick={() => addBar(Zones.Z3.min)} style={{ backgroundColor: Colors.GREEN }}>Z3</button>
            <button className="btn btn-square" onClick={() => addBar(Zones.Z4.min)} style={{ backgroundColor: Colors.YELLOW }}>Z4</button>
            <button className="btn btn-square" onClick={() => addBar(Zones.Z5.min)} style={{ backgroundColor: Colors.ORANGE }}>Z5</button>
            <button className="btn btn-square" onClick={() => addBar(Zones.Z6.min)} style={{ backgroundColor: Colors.RED }}>Z6</button>                        
          </div>
          :
          <button className="btn" onClick={() => addBar(1, 300, 0, 0)} style={{ backgroundColor: Colors.WHITE }}><SteadyLogo className="btn-icon" /> Steady Pace</button>
        }
        {sportType === "bike" &&
          <button className="btn" onClick={() => addFreeRide()} style={{ backgroundColor: Colors.WHITE }}><FontAwesomeIcon icon={faBicycle} size="lg" fixedWidth /> Free Ride</button>
        }
        
        <button className="btn" onClick={() => addTrapeze(0.25, 0.75)} style={{ backgroundColor: Colors.WHITE }}><WarmupLogo className="btn-icon" /> Warm up</button>
        <button className="btn" onClick={() => addTrapeze(0.75, 0.25)} style={{ backgroundColor: Colors.WHITE }}><WarmdownLogo className="btn-icon" /> Cool down</button>
        <button className="btn" onClick={() => addInterval()} style={{ backgroundColor: Colors.WHITE }}><IntervalLogo className="btn-icon" /> Interval</button>        
        <button className="btn" onClick={() => addInstruction()} style={{ backgroundColor: Colors.WHITE }}><FontAwesomeIcon icon={faComment} size="lg" fixedWidth /> Text Event</button>
        {sportType === "bike" &&
          <div className="form-input">
            <label htmlFor="ftp">FTP (W)</label>
            <input className="textInput" type="number" name="ftp" value={ftp} onChange={(e) => setFtp(parseInt(e.target.value))} />
          </div>
        }

        {sportType === "bike" &&
          <div className="form-input">
            <label htmlFor="weight">Body Weight (Kg)</label>
            <input className="textInput" type="number" name="weight" value={weight} onChange={(e) => setWeight(parseInt(e.target.value))} />
          </div>
        }

        <button className="btn" onClick={() => { if (window.confirm('Are you sure you want to create a new workout?')) newWorkout() }}><FontAwesomeIcon icon={faFile} size="lg" fixedWidth /> New</button>
        <button className="btn" onClick={() => saveWorkout()}><FontAwesomeIcon icon={faSave} size="lg" fixedWidth /> Save</button>
        <button className="btn" onClick={() => { if (window.confirm('Are you sure you want to delete this workout?')) deleteWorkout() }}><FontAwesomeIcon icon={faTrash} size="lg" fixedWidth /> Delete</button>
        <button className="btn" onClick={() => downloadWorkout()} ><FontAwesomeIcon icon={faDownload} size="lg" fixedWidth /> Download</button>
        <input
          accept=".xml,.zwo"
          id="contained-button-file"
          type="file"
          style={{ display: 'none' }}
          onChange={(e) => handleUpload(e.target.files![0])}
        />
        <button className="btn" onClick={() => document.getElementById("contained-button-file")!.click()}><FontAwesomeIcon icon={faUpload} size="lg" fixedWidth /> Upload</button>
        <button className="btn" onClick={() => setShowWorkouts(true)}><FontAwesomeIcon icon={faList} size="lg" fixedWidth /> Workouts</button>
        <button className="btn" onClick={() => shareWorkout()} ><FontAwesomeIcon icon={faShareAlt} size="lg" fixedWidth /> Share</button>
      </div>
      <Footer />
    </div>

  )
}

export default Editor