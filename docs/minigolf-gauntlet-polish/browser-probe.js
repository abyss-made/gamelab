// Read-only renderer instrumentation; no game state, clock or inputs are changed.
(() => {
 let factory;window.__golfImpacts=[];
 Object.defineProperty(window,'GolfClubScene',{configurable:true,get:()=>factory,set(value){
  const create=value.create.bind(value);
  value.create=async(...args)=>{
   const scene=await create(...args),frame=scene.frame.bind(scene),impact=scene.impact.bind(scene);window.__actualGolfScene=scene;
   scene.impact=(event,now)=>{window.__golfImpacts.push({...event,shot:scene.effectShot??null,at:now});if(window.__golfImpacts.length>300)window.__golfImpacts.shift();return impact(event,now);};
   scene.frame=data=>{const result=frame(data);if(scene.lastNow===data.now){const phase=GolfMotion.clock(data.g.hole,data.g.anim,data.shotTime||0);window.__golfProbe={shot:data.g.anim?.shot??null,elapsed:data.shotTime||0,serverElapsed:(data.g.anim?.elapsedMs||0)/1000,motorTime:phase,parkedTime:data.g.hole.motorTime||0,rotors:scene.motors.map(m=>({id:m.definition.id,actual:m.group.rotation.y,expected:-GolfMotion.pose(m.definition,phase).angle})),aiming:!!data.aiming,camera:scene.camera.matrixWorld.elements.slice(),drawCalls:scene.renderer.info.render.calls};}return result;};return scene;
  };factory=value;
 }});
})();
