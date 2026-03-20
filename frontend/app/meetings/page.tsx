"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar, Clock, Users, Video, Phone, Plus, XIcon, MapPin, Bell } from "lucide-react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { Card, Badge, Button } from "@/components/ui"
import { getMeetingsList, joinMeeting, scheduleMeeting, setMeetingReminder } from "@/services/api"

interface Meeting {
  id: string
  title: string
  description: string
  date: string
  time: string
  startTime: string
  endTime: string
  attendees: string[]
  location: string
  type: "video" | "phone" | "in-person"
  status: "upcoming" | "ongoing" | "completed"
  meetingLink?: string
}

export default function MeetingsModule() {
  const [meetings, setMeetings] = useState<Meeting[]>([])

  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [showScheduler, setShowScheduler] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    attendees: "",
    location: "",
    type: "video" as "video" | "phone" | "in-person",
  })

  const loadMeetings = async () => {
    const data = await getMeetingsList()
    const mapped: Meeting[] = (Array.isArray(data) ? data : []).map((m: any) => ({
      id: String(m.id),
      title: m.title || "Untitled Meeting",
      description: m.description || "",
      date: m.date || "",
      time: m.time || m.start_time || "",
      startTime: m.start_time || m.time || "",
      endTime: m.end_time || "",
      attendees: Array.isArray(m.attendees) ? m.attendees : [],
      location: m.location || "",
      type: m.type || "video",
      status: m.status || "upcoming",
      meetingLink: m.meeting_link,
    }))
    setMeetings(mapped)
  }

  useEffect(() => {
    loadMeetings()
  }, [])

  const handleScheduleMeeting = async () => {
    if (!formData.title || !formData.date || !formData.time) return
    await scheduleMeeting({
      title: formData.title,
      description: formData.description,
      date: formData.date,
      time: formData.time,
      attendees: formData.attendees.split(",").map((a) => a.trim()).filter(Boolean),
      location: formData.location,
      type: formData.type,
    })
    await loadMeetings()
    setFormData({
      title: "",
      description: "",
      date: "",
      time: "",
      attendees: "",
      location: "",
      type: "video",
    })
    setShowScheduler(false)
  }

  const upcomingMeetings = meetings.filter((m) => m.status === "upcoming")
  const ongoingMeetings = meetings.filter((m) => m.status === "ongoing")

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="w-4 h-4" />
      case "phone":
        return <Phone className="w-4 h-4" />
      default:
        return <MapPin className="w-4 h-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ongoing":
        return <Badge variant="pro" pulse>ONGOING</Badge>
      case "upcoming":
        return <Badge variant="outline">UPCOMING</Badge>
      default:
        return <Badge>COMPLETED</Badge>
    }
  }

  return (
    <DashboardLayout
      title="Meetings & Calendar"
      subtitle="Schedule, manage, and join meetings"
      actions={
        <Button
          variant="pro"
          size="sm"
          onClick={() => setShowScheduler(!showScheduler)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Schedule Meeting
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scheduler */}
        <AnimatePresence>
          {showScheduler && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="lg:col-span-1"
            >
              <Card variant="glass" padding="lg" className="border-[--primary]/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black">Schedule Meeting</h3>
                  <button
                    onClick={() => setShowScheduler(false)}
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-bold mb-2 block">Meeting Title</label>
                    <input
                      type="text"
                      placeholder="e.g., Team Sync"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded text-sm focus:outline-none focus:border-[--primary]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold mb-2 block">Description</label>
                    <textarea
                      placeholder="Meeting details..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded text-sm focus:outline-none focus:border-[--primary] resize-none h-20"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold mb-2 block">Date</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded text-sm focus:outline-none focus:border-[--primary]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold mb-2 block">Time</label>
                    <input
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded text-sm focus:outline-none focus:border-[--primary]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold mb-2 block">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded text-sm focus:outline-none focus:border-[--primary]"
                    >
                      <option value="video">Video Call</option>
                      <option value="phone">Phone Call</option>
                      <option value="in-person">In Person</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-bold mb-2 block">Location / Link</label>
                    <input
                      type="text"
                      placeholder="Room or URL"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded text-sm focus:outline-none focus:border-[--primary]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold mb-2 block">Attendees (comma-separated)</label>
                    <textarea
                      placeholder="alice@company.com, bob@company.com"
                      value={formData.attendees}
                      onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded text-sm focus:outline-none focus:border-[--primary] resize-none h-20"
                    />
                  </div>

                  <Button
                    variant="pro"
                    size="sm"
                    onClick={handleScheduleMeeting}
                    className="w-full"
                  >
                    Create Meeting
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Meetings List */}
        <div className={showScheduler ? "lg:col-span-2" : "lg:col-span-3"}>
          <div className="space-y-6">
            {/* Ongoing Meetings */}
            {ongoingMeetings.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="pro" pulse>LIVE NOW</Badge>
                  <h3 className="font-black">Active Meetings</h3>
                </div>
                <div className="space-y-4">
                  {ongoingMeetings.map((meeting) => (
                    <motion.div
                      key={meeting.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => setSelectedMeeting(meeting)}
                      className="p-4 bg-linear-to-r from-[--primary]/20 to-[--accent-violet]/20 border border-[--primary]/50 rounded-lg cursor-pointer hover:border-[--primary] transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-black text-lg">{meeting.title}</h4>
                            {getStatusBadge(meeting.status)}
                          </div>
                          <p className="text-sm text-[--text-muted] mb-3">{meeting.description}</p>
                          <div className="flex flex-wrap gap-4 text-xs">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {meeting.time}
                            </div>
                            <div className="flex items-center gap-1">
                              {getTypeIcon(meeting.type)}
                              {meeting.type === "in-person" ? meeting.location : "Virtual"}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {meeting.attendees.length} attendees
                            </div>
                          </div>
                        </div>
                        {meeting.type === "video" && (
                          <Button
                            variant="pro"
                            size="sm"
                            onClick={async (e) => {
                              e.stopPropagation()
                              const joined = await joinMeeting(meeting.id)
                              const url = joined?.join_url || meeting.meetingLink
                              if (url) window.open(url, "_blank")
                            }}
                          >
                            Join Meeting
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Meetings */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-[--primary]" />
                <h3 className="font-black">Upcoming Meetings</h3>
              </div>
              <div className="space-y-4">
                {upcomingMeetings.map((meeting) => (
                  <motion.div
                    key={meeting.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => setSelectedMeeting(meeting)}
                    className="p-4 bg-black/40 border border-white/10 rounded-lg cursor-pointer hover:border-[--primary] transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-bold">{meeting.title}</h4>
                          {getStatusBadge(meeting.status)}
                        </div>
                        <p className="text-sm text-[--text-muted] mb-2">{meeting.description}</p>
                        <div className="flex flex-wrap gap-4 text-xs text-[--text-muted]">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {meeting.date}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {meeting.time}
                          </div>
                          <div className="flex items-center gap-1">
                            {getTypeIcon(meeting.type)}
                            {meeting.type === "in-person" ? meeting.location : "Virtual"}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {meeting.attendees.length} attendees
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async (e) => {
                            e.stopPropagation()
                            if (meeting.type === "video") {
                              const joined = await joinMeeting(meeting.id)
                              const url = joined?.join_url || meeting.meetingLink
                              if (url) window.open(url, "_blank")
                            }
                          }}
                        >
                          {meeting.type === "video" ? "Join" : "Details"}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Meeting Details Sidebar */}
        {selectedMeeting && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="lg:col-span-1"
          >
            <Card variant="glass" padding="lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black">Meeting Details</h3>
                <button
                  onClick={() => setSelectedMeeting(null)}
                  className="p-1 hover:bg-white/10 rounded"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-[--text-muted] uppercase mb-1">Title</p>
                  <p className="font-bold">{selectedMeeting.title}</p>
                </div>

                <div>
                  <p className="text-xs font-bold text-[--text-muted] uppercase mb-1">When</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[--primary]" />
                    <span>{selectedMeeting.date}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-4 h-4 text-[--primary]" />
                    <span>{selectedMeeting.time}</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-[--text-muted] uppercase mb-1">Where</p>
                  <div className="flex items-center gap-2">
                    {getTypeIcon(selectedMeeting.type)}
                    <span>{selectedMeeting.location}</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-[--text-muted] uppercase mb-2">Attendees</p>
                  <div className="space-y-2">
                    {selectedMeeting.attendees.map((attendee, idx) => (
                      <div key={idx} className="p-2 rounded bg-black/40 border border-white/10 text-sm">
                        {attendee}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-[--text-muted] uppercase mb-1">Description</p>
                  <p className="text-sm">{selectedMeeting.description}</p>
                </div>

                {selectedMeeting.type === "video" && (
                  <Button
                    variant="pro"
                    size="sm"
                    className="w-full"
                    onClick={async () => {
                      const joined = await joinMeeting(selectedMeeting.id)
                      const url = joined?.join_url || selectedMeeting.meetingLink
                      if (url) window.open(url, "_blank")
                    }}
                  >
                    <Video className="w-4 h-4 mr-2" /> Join Video Call
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full flex items-center gap-2"
                  onClick={async () => {
                    await setMeetingReminder(selectedMeeting.id, 15)
                  }}
                >
                  <Bell className="w-4 h-4" /> Set Reminder
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  )
}
