$(document).ready(function(){
    $('.modal').modal();
  });
var app = new Vue({
  el: "#app",
  data: {
    options: ["Yes", "No"],
    pollTitle: "Do You Like Glitch?",
    currentOption: '',
    loading: false
  },
  methods:{
    openModal : (e)=>{
       $('#modal1').modal('open');
    },
    
    addOptions: function(){
      console.log(this.options)
      if(this.currentOption != ""){
        this.options.push(this.currentOption)
      }
      this.currentOption = ""
      $("#modal1").modal("close")
    },
    deleteOption: function(index){
      console.log(index)
      this.options.splice(index, 1)
    },
    createPoll:  function(){
      var _self = this;
      var postData = {"title": this.pollTitle, "options": this.options}
      $.post("/poll/create", postData)
        .done(function(data){
        if(data.id){
          Materialize.toast("Poll Created", 1000)
          window.location.href = window.location.origin + "/poll/" + data.id
        }
      })
    }
  }
})