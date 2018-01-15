import React, { Component } from 'react';
import './App.css';

import Fetch from './Fetch.js';

import loading_apple from './images/loading_apple.gif';

const initialYear = 2017;
const WRONG_INPUT = (
              <tr>
                <td colSpan={8}>Wrong Input. Please check course code.</td>
              </tr>
            );
const INITIAL_SEARCH_RESULT = (
              <tr>
                <td colSpan={8}>Please enter the course code into the search box. (example: cmpe150)</td>
              </tr>
);

const INITIAL_ADD_BOX = (
  <tr>
    <td colSpan={8}>Added Courses will be shown here.</td>
  </tr>
);


const SCHEDULE_DATA = new Map();
const ADDED_COURSES = new Map();
let AVAILABLE_COURSES = new Map();
const AVAILABLE_DEPARTMENTS = new Map();
const ADDED_DEPARTMENTS = new Map();
const REQUESTED_DEPARTMENTS = new Map();
let semester = undefined;

class App extends Component {
  constructor(props){
    super(props);
    this.state = {
      searchText: "",
      loading: false
    };

    this.getLastedSemester()
      .then(()=>console.log("semester: ", semester))
      .then(()=>this.getDepartments())
      .then(()=>{
        console.log("Departments list is fetched!");
      })
      .catch((e) => console.log(e));
  }

  getLastedSemester(){
    return Fetch("/getLastedSemester","GET")
      .then((response) => {
        semester = response.semester;
      })
      .catch((e) => console.log(e));
  }
  getDepartments(){
    return Fetch("/getDepartments","GET")
      .then((departments) => {
        departments.forEach((dep,index)=>{
          dep.id = index;
          if(!AVAILABLE_DEPARTMENTS.has(dep.short)){
            let array = [dep];
            AVAILABLE_DEPARTMENTS.set(dep.short,array);
          }else{
            let array = AVAILABLE_DEPARTMENTS.get(dep.short);
            array.push(dep);
            AVAILABLE_DEPARTMENTS.set(dep.short,array);
          }
        });
      })
      .catch((e) => console.log(e));
  }
  addDepartment(department){
    if(ADDED_DEPARTMENTS.has(department.short)){
      return new Promise((resolve,reject) => {
        reject("already added!");
      });
    }
    const request = REQUESTED_DEPARTMENTS.get(department.short + department.id);
    if(request!==undefined && (Date.now()-request.date) < 10000){
      return new Promise((resolve,reject) => {
        reject("already requested!");
      });
    }else{
      const json = {
        "semester": semester,
        "short": department.short,
        "long": department.long
      };
      const promise = Fetch("/getCourses","POST",json)
        .then((courses) => {
          ADDED_DEPARTMENTS.set(department.short,department);
          console.log("courses for department:" ,courses);
          courses.forEach((course) => {
            console.log("add course" , course);
            if(!AVAILABLE_COURSES.has(course.code)){
              AVAILABLE_COURSES.set(course.code,course);
            }else{
              //console.log('course is already in the map!',course.code);
            }
          });
          AVAILABLE_COURSES = new Map([...AVAILABLE_COURSES.entries()].sort());
        })
        .catch((e) => console.log(e));
        REQUESTED_DEPARTMENTS.set(department.short+department.id,{
          promise: promise,
          date: Date.now()
        });
        return promise;
    }
  }
  isNum(ch){
    return ch>= '0' && ch<='9';
  }
  isDot(ch){
    return ch == '.';
  }
  isAlphabet(ch){
    return ch>='A' && ch<='Z';
  }
  findRelatedDepartments(text){
    const result = [];
    AVAILABLE_DEPARTMENTS.forEach((value,key) => {
      if(key.includes(text)){
        //value => department array
        value.forEach(function(dep){
          result.push(dep);
        });
      }
    });
    return result;
  }
  findRelatedCourses(text){
    const result = [];
    console.log("Find Courses!");
    AVAILABLE_COURSES.forEach((value,key) => {
      console.log("key", key);
      if(key.includes(text)){
        result.push(value);
      }
    });
    return result;
  }
  calcConflits(course){
    let nConflict = 0;
    const hourCodes = this.getHourCodes(course.time);
    hourCodes.forEach((hour) => {
      const schedule = SCHEDULE_DATA.get(hour);
      if(schedule!==undefined){
        if(schedule instanceof Map || schedule.code !== course.code){
          nConflict++;
        }
      }
    });
    return nConflict;
  }
  getCourseView(courseObj,i){
    const nConflicts = this.calcConflits(courseObj);
    return (
      <tr className={i%2==0?"table-row-even":"table-row-odd"}>
        <td className="column-even">{courseObj.code}</td>
        <td className="column-odd">{courseObj.name}</td>
        <td className="column-even">{courseObj.instructor}</td>
        <td className="column-odd">{courseObj.time}</td>
        <td className="column-even">{courseObj.credits}</td>
        <td className="column-odd">{courseObj.ects}</td>
        <td className="column-even">
          <div style={{color:(nConflicts===0)?'black':'red'}}>
            {nConflicts}
          </div>
        </td>
        <td className="column-odd">
          {
            ADDED_COURSES.has(courseObj.code)
            ?
            <button onClick={()=>this.removeCourse(courseObj)}>Remove</button>
            :
            <button onClick={()=>this.addCourse(courseObj)}>Add</button>
          }
        </td>
      </tr>
    );
  }
  searchResults(searchText = ""){
    searchText = searchText.toUpperCase();
    if(searchText.length<1){
      return INITIAL_SEARCH_RESULT;
    }else{
      let state = 0;
      let department = "";
      let course = "";
      let section = "";
      for(let i = 0;i<searchText.length;i++){
        const ch = searchText.charAt(i);
        switch (state) {
          case 0: //Getting Department Code
            if(!this.isAlphabet(ch) && this.isNum(ch)){
              course += ch;
              state = 1;
            }else if(this.isAlphabet(ch)){
              department += ch;
            }else{
              return WRONG_INPUT;
            }
            break;
          case 1: //Getting Course Code
            if(!this.isNum(ch) && this.isDot(ch)){
              state = 2;
            }else if(this.isNum(ch)){
              course += ch;
            }else{
              return WRONG_INPUT;
            }
            break;
          case 2: //Getting Section Code
            if(this.isNum()){
              section += ch;
            }
            break;
          default:
            throw 'Unknown State exception!';
        }
      }
      console.log("department:", department);
      console.log("course:", course);
      console.log("section", section);

      //NOTE: Searching Happens HERE
      const dep = AVAILABLE_DEPARTMENTS.get(department);
      const courses = this.findRelatedCourses(department+course+section);
        if(dep===undefined){
          if(courses.length>0){
            console.log("dep undefined", courses);
            let i = 0;
            return courses.map((courseObj) => {
              return this.getCourseView(courseObj,i++);
            });
          }else{
              const objs = this.findRelatedDepartments(department);
              if(objs.length === 0){
                return WRONG_INPUT;
              }
              return objs.map((obj)=>{
                return <tr><td colSpan={8}>Department: {obj.short}</td></tr>
              })
          }
        }else{
          if(!ADDED_DEPARTMENTS.has(department)){
            this.setState({loading:true});
            let context = this;
            dep.forEach(function(depItem){
              console.log(depItem);
              context.addDepartment(depItem)
                .then(() => context.setState({loading:false}))
                .catch((e) => console.log(e));
            });
          }else{
            console.log("dep", courses);
            let i = 0;
            return courses.map((courseObj) => {
              return this.getCourseView(courseObj,i++);
            });
          }
        }
    }

  }
  cleanSchedule(){
    ADDED_COURSES.clear();
    SCHEDULE_DATA.clear();
    this.forceUpdate();
  }
  getHourCodes(time=""){
    if(time==="" || time==="TBA"){
      return [];
    }
    let hourCodes = [];
    let ch = time.charAt(0);
    time = time.substr(1);
    let index = 0;
    while(ch !== ""){
      switch (ch) {
        case 'M':
        case 'T':
        case 'W':
        case 'F':
          hourCodes.push(ch);
          break;
        case 'h':
          hourCodes.push(hourCodes.pop()+'h');
          break;
        case '1':
          if(hourCodes.length-index !== time.length+1){
              const ch2 = time.charAt(0);
              time = time.substr(1);
              hourCodes[index] = hourCodes[index] + '1' + ch2;
          }else{
              hourCodes[index] = hourCodes[index] + '1';
          }
          index++;
          break;
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          hourCodes[index] = hourCodes[index] + ch;
          index++;
          break;
        default:
          console.log('Unknown time structure!');
      }
      ch = time.charAt(0);
      time = time.substr(1);
    }
    return hourCodes;
  }
  addCourse(course){
    const hourCodes = this.getHourCodes(course.time);
    hourCodes.forEach((code)=>{
      const relatedCourses = SCHEDULE_DATA.get(code);
      if(relatedCourses===undefined){
        SCHEDULE_DATA.set(code,course);
      }else if(relatedCourses instanceof Map){
        relatedCourses.set(course.code,true);
      }else{
        SCHEDULE_DATA.set(code,new Map([[relatedCourses.code,relatedCourses],
                                                        [course.code,course]]));
      }
    });
    ADDED_COURSES.set(course.code,course);
    this.forceUpdate();
  }
  removeCourse(course){
    const hourCodes = this.getHourCodes(course.time);
    hourCodes.forEach((code)=>{
      const relatedCourses = SCHEDULE_DATA.get(code);
      if(relatedCourses===undefined){
        //Already not added
      }else if(relatedCourses instanceof Map){
        relatedCourses.delete(course.code);
        if(relatedCourses.size == 1){
          relatedCourses.forEach((value,key) => {
            SCHEDULE_DATA.set(code,value);
          });
        }
      }else if(relatedCourses.code===course.code){
        SCHEDULE_DATA.delete(code);
      }
    });
    ADDED_COURSES.delete(course.code);
    this.forceUpdate();
  }
  getRelatedCourse(hourCode){
    const relatedCourses = SCHEDULE_DATA.get(hourCode);
    if(relatedCourses===undefined){
      return "";
    }else if(relatedCourses instanceof Map){
      return <div style={{color:"red"}}>CONFLICT</div>
    }else{
      return relatedCourses.code || "";
    }
  }
  getAddedCourses(){
    const result = [];
    let i = 0;
    ADDED_COURSES.forEach((courseObj) => {
      result.push(this.getCourseView(courseObj,i++));
    });
    if(result.length===0){
      return INITIAL_ADD_BOX;
    }
    return result;
  }
  prepareFooterYear(){
    const date = new Date();
    if(initialYear === date.getFullYear()){
      return initialYear;
    }
    return initialYear + " - " + date.getFullYear();
  }
  render() {
    console.log("search: ", this.state.searchText);
    return (
      <div className="App">
        <div className="App-header">
          <h3 className="header-main">BOUN Course Planner</h3>
          <h5 className="header-text">Always uses latest Registration Data</h5>
          <p className="header-text">Notes: Lab and PS hours are not included.</p>
        </div>
        <div className="App-content">
          <div className="Selection">
            <div>
              <div className="course-search">
                <div className="search-bar">
                    <h4 style={{display: 'inline'}}>Search:</h4>
                    <input className="search-input" type="text"  onChange={(event) => {
                      this.setState({searchText:event.target.value});
                    }} />
                </div>
                <div className="search-results">
                  {
                    this.state.loading?
                    <img src={loading_apple} className="search-loading"></img>
                    :
                    (
                  <table className="schedule-table">
                    <tr className="table-row table-description-row">
                      <td className="column-even">Code</td>
                      <td className="column-odd">Name</td>
                      <td className="column-even">Instr.</td>
                      <td className="column-odd">Time</td>
                      <td className="column-even">Credits</td>
                      <td className="column-odd">Ects</td>
                      <td className="column-even">#Conflicts</td>
                      <td className="column-odd">Add/Remove</td>
                    </tr>
                    {this.searchResults(this.state.searchText)}
                  </table>
                    )
                  }
                </div>
              </div>
              <div className="course-list">
                <h5 style={{padding:0,margin:0}}>ADDED COURSES</h5>
                <div className="add-table-scroll">
                <table className="schedule-table">
                  <tr className="table-row table-description-row">
                    <td className="column-even">Code</td>
                    <td className="column-odd">Name</td>
                    <td className="column-even">Instr.</td>
                    <td className="column-odd">Time</td>
                    <td className="column-even">Credits</td>
                    <td className="column-odd">Ects</td>
                    <td className="column-even">#Conflicts</td>
                    <td className="column-odd">Add/Remove</td>
                  </tr>
                  {this.getAddedCourses()}
                </table>
                </div>
              </div>
            </div>
            <div className="Schedule">
              <h4 className="schedule-header" style={{padding:0,margin:0}}>Weekly Schedule</h4>
              <table className="schedule-table">
                {/*Table Descriptions*/}
                <tr className="table-row table-description-row">
                  <td>Time<br/>Day</td>
                  <td className="column-even">09:00<br/>10:00</td>
                  <td className="column-odd">10:00<br/>11:00</td>
                  <td className="column-even">11:00<br/>12:00</td>
                  <td className="column-odd">12:00<br/>13:00</td>
                  <td className="column-even">13:00<br/>14:00</td>
                  <td className="column-odd">14:00<br/>15:00</td>
                  <td className="column-even">15:00<br/>16:00</td>
                  <td className="column-odd">16:00<br/>17:00</td>
                  <td className="column-even">17:00<br/>18:00</td>
                  <td className="column-odd">18:00<br/>19:00</td>
                  <td className="column-even">19:00<br/>20:00</td>
                </tr>
                <tr className="table-row table-row-even">
                  <td>Monday</td>
                  <td className="column-even">{this.getRelatedCourse("M1")}</td>
                  <td className="column-odd">{this.getRelatedCourse("M2")}</td>
                  <td className="column-even">{this.getRelatedCourse("M3")}</td>
                  <td className="column-odd">{this.getRelatedCourse("M4")}</td>
                  <td className="column-even">{this.getRelatedCourse("M5")}</td>
                  <td className="column-odd">{this.getRelatedCourse("M6")}</td>
                  <td className="column-even">{this.getRelatedCourse("M7")}</td>
                  <td className="column-odd">{this.getRelatedCourse("M8")}</td>
                  <td className="column-even">{this.getRelatedCourse("M9")}</td>
                  <td className="column-odd">{this.getRelatedCourse("M10")}</td>
                  <td className="column-even">{this.getRelatedCourse("M11")}</td>
                </tr>
                <tr className="table-row table-row-odd">
                  <td>Tuesday</td>
                  <td className="column-even">{this.getRelatedCourse("T1")}</td>
                  <td className="column-odd">{this.getRelatedCourse("T2")}</td>
                  <td className="column-even">{this.getRelatedCourse("T3")}</td>
                  <td className="column-odd">{this.getRelatedCourse("T4")}</td>
                  <td className="column-even">{this.getRelatedCourse("T5")}</td>
                  <td className="column-odd">{this.getRelatedCourse("T6")}</td>
                  <td className="column-even">{this.getRelatedCourse("T7")}</td>
                  <td className="column-odd">{this.getRelatedCourse("T8")}</td>
                  <td className="column-even">{this.getRelatedCourse("T9")}</td>
                  <td className="column-odd">{this.getRelatedCourse("T10")}</td>
                  <td className="column-even">{this.getRelatedCourse("T11")}</td>
                </tr>
                <tr className="table-row table-row-even">
                  <td>Wednesday</td>
                  <td className="column-even">{this.getRelatedCourse("W1")}</td>
                  <td className="column-odd">{this.getRelatedCourse("W2")}</td>
                  <td className="column-even">{this.getRelatedCourse("W3")}</td>
                  <td className="column-odd">{this.getRelatedCourse("W4")}</td>
                  <td className="column-even">{this.getRelatedCourse("W5")}</td>
                  <td className="column-odd">{this.getRelatedCourse("W6")}</td>
                  <td className="column-even">{this.getRelatedCourse("W7")}</td>
                  <td className="column-odd">{this.getRelatedCourse("W8")}</td>
                  <td className="column-even">{this.getRelatedCourse("W9")}</td>
                  <td className="column-odd">{this.getRelatedCourse("W10")}</td>
                  <td className="column-even">{this.getRelatedCourse("W11")}</td>
                </tr>
                <tr className="table-row table-row-odd">
                  <td>Thursday</td>
                  <td className="column-even">{this.getRelatedCourse("Th1")}</td>
                  <td className="column-odd">{this.getRelatedCourse("Th2")}</td>
                  <td className="column-even">{this.getRelatedCourse("Th3")}</td>
                  <td className="column-odd">{this.getRelatedCourse("Th4")}</td>
                  <td className="column-even">{this.getRelatedCourse("Th5")}</td>
                  <td className="column-odd">{this.getRelatedCourse("Th6")}</td>
                  <td className="column-even">{this.getRelatedCourse("Th7")}</td>
                  <td className="column-odd">{this.getRelatedCourse("Th8")}</td>
                  <td className="column-even">{this.getRelatedCourse("Th9")}</td>
                  <td className="column-odd">{this.getRelatedCourse("Th10")}</td>
                  <td className="column-even">{this.getRelatedCourse("Th11")}</td>
                </tr>
                <tr className="table-row table-row-even">
                  <td>Friday</td>
                  <td className="column-even">{this.getRelatedCourse("F1")}</td>
                  <td className="column-odd">{this.getRelatedCourse("F2")}</td>
                  <td className="column-even">{this.getRelatedCourse("F3")}</td>
                  <td className="column-odd">{this.getRelatedCourse("F4")}</td>
                  <td className="column-even">{this.getRelatedCourse("F5")}</td>
                  <td className="column-odd">{this.getRelatedCourse("F6")}</td>
                  <td className="column-even">{this.getRelatedCourse("F7")}</td>
                  <td className="column-odd">{this.getRelatedCourse("F8")}</td>
                  <td className="column-even">{this.getRelatedCourse("F9")}</td>
                  <td className="column-odd">{this.getRelatedCourse("F10")}</td>
                  <td className="column-even">{this.getRelatedCourse("F11")}</td>
                </tr>
              </table>
            </div>
          </div>
        </div>
        <div className="App-footer">
          <h6 className="footer-text">
            ©{this.prepareFooterYear()}
          </h6>
        </div>
      </div>
    );
  }
}

export default App;
